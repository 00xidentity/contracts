import { JsonRpcProvider } from "@ethersproject/providers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BytesLike } from "ethers";
import { Provider } from "@ethersproject/providers";

import {
  eu,
  GOOD_SIGNER_INDEX,
  makeSig,
  createLegatoIDInstance as createKycIdInstance,
  makeSigWithVerification,
} from "./testUtils";

function cl(...data: any[]) {
  console.log("<--->");
  console.log(...data);
  console.log("<--->");
}
const EXPECT_REVERT = expect;
describe("CreatorID", function () {
  let SIGNERS: SignerWithAddress[];
  let GOOD_SIGNER: SignerWithAddress;
  this.beforeAll(async () => {
    SIGNERS = await ethers.getSigners();
    GOOD_SIGNER = SIGNERS[GOOD_SIGNER_INDEX];
  });

  it("signes with empty signature", async () => {
    const { NFT, adminAddress, provider } = await createKycIdInstance(
      GOOD_SIGNER.address
    );

    const chainid = (await provider?.getNetwork())?.chainId || "";
    const verificationID = "verification_AbC";
    const SIGNATURE_1 = await makeSigWithVerification(
      NFT.address,
      adminAddress,
      chainid as string,
      provider as Provider,
      verificationID
    );
    // ---<Successfull mint with good signer---
    await NFT.mint(
      SIGNATURE_1.expireBlock as number,
      SIGNATURE_1.sig as BytesLike,
      verificationID,
      {
        value: eu.parseEther("0.01"),
      }
    );
    expect(await NFT.balanceOf(adminAddress)).to.eq(1);
  });
  it("works with signature 1", async () => {
    const { NFT, adminAddress } = await createKycIdInstance(
      GOOD_SIGNER.address
    );

    cl("sig 1");
    // ---<unSuccessfull mint with WRONG signer---
    const SIGNATURE_1 = await makeSig(NFT, adminAddress);
    expect(await NFT.balanceOf(adminAddress)).to.eq(0);
    await expect(
      NFT.mint(
        SIGNATURE_1.expireBlock,
        SIGNATURE_1.signed_WRONGSigner,
        SIGNATURE_1.verificationId,
        {
          value: eu.parseEther("0.01"),
        }
      )
    ).to.be.revertedWith("Invalid signer");
    expect(await NFT.balanceOf(adminAddress)).to.eq(0);

    // ---<Successfull mint with good signer---
    cl("sig 2");
    await NFT.mint(
      SIGNATURE_1.expireBlock,
      SIGNATURE_1.signedCorrectSigner,
      SIGNATURE_1.verificationId,
      {
        value: eu.parseEther("0.01"),
      }
    );
    expect(await NFT.balanceOf(adminAddress)).to.eq(1);

    // ---<unSuccessfull mint due to wrong signer---
    cl("sig 3");
    await EXPECT_REVERT(
      NFT.mint(
        SIGNATURE_1.expireBlock,
        SIGNATURE_1.signedCorrectSigner,
        SIGNATURE_1.verificationId,
        {
          value: eu.parseEther("0.01"),
        }
      )
    ).to.be.revertedWith("Invalid signer"); // due to nonce changing

    // ---<unSuccessfull mint since already minted once even with valid signature---
    cl("sig 4");
    const SECOND_VALID_SIG = await makeSig(NFT, adminAddress);
    await EXPECT_REVERT(
      NFT.mint(
        SECOND_VALID_SIG.expireBlock,
        SECOND_VALID_SIG.signedCorrectSigner,
        SECOND_VALID_SIG.verificationId,
        {
          value: eu.parseEther("0.01"),
        }
      )
    ).to.be.revertedWith("Balance"); // due to nonce changing
    expect(await NFT.balanceOf(adminAddress)).to.eq(1);

    cl("sig 5");
    // ---<unSuccessfull burn since signed by bad signer---
    const SIGNATURE_2 = await makeSig(NFT, adminAddress);
    await EXPECT_REVERT(
      NFT.burn(
        SIGNATURE_2.expireBlock,
        SIGNATURE_2.signed_WRONGSigner,
        SIGNATURE_2.verificationId
      )
    ).to.be.revertedWith("Invalid signer");

    cl("sig 6");
    // ---<Successfull burn with signed by good signer---
    await NFT.burn(
      SIGNATURE_2.expireBlock,
      SIGNATURE_2.signedCorrectSigner,
      SIGNATURE_2.verificationId
    );
    expect(await NFT.balanceOf(adminAddress)).to.eq(0);

    cl("sig 7");
    // ---<Successfull mint with good signature ---
    const SIGNATURE_3 = await makeSig(NFT, adminAddress);
    await NFT.mint(
      SIGNATURE_3.expireBlock,
      SIGNATURE_3.signedCorrectSigner,
      SIGNATURE_3.verificationId,
      {
        value: eu.parseEther("0.01"),
      }
    );
    expect(await NFT.balanceOf(adminAddress)).to.eq(1);

    // ---<UnSuccessfull Burn since same signature but nonce changed---
    cl("sig 8");
    await EXPECT_REVERT(
      NFT.burn(
        SIGNATURE_3.expireBlock,
        SIGNATURE_3.signedCorrectSigner,
        SIGNATURE_3.verificationId
      )
    ).to.be.revertedWith("Invalid signer");

    // ---<Successfull Burn after balance is one with a good sig ---
    cl("sig 9");
    expect(await NFT.balanceOf(adminAddress)).to.eq(1);
    const SIGNATURE_4 = await makeSig(NFT, adminAddress);
    await NFT.burn(
      SIGNATURE_4.expireBlock,
      SIGNATURE_4.signedCorrectSigner,
      SIGNATURE_4.verificationId
    );
    expect(await NFT.balanceOf(adminAddress)).to.eq(0);

    // ---<Burn after balance is zero with a good sig ---
    cl("sig 10");
    const SIGNATURE_5 = await makeSig(NFT, adminAddress);
    await EXPECT_REVERT(
      NFT.burn(
        SIGNATURE_5.expireBlock,
        SIGNATURE_5.signedCorrectSigner,
        SIGNATURE_5.verificationId
      )
    ).to.be.revertedWith("balance");
  });

  it("saved timestamps and verify codes on minting", async () => {
    const { NFT, adminAddress } = await createKycIdInstance(
      GOOD_SIGNER.address
    );
    const SIGNATURE = await makeSig(NFT, adminAddress);
    expect(await NFT.getVerifyCodeForId(1)).to.eq("");
    await NFT.mint(
      SIGNATURE.expireBlock,
      SIGNATURE.signedCorrectSigner,
      SIGNATURE.verificationId,
      {
        value: eu.parseEther("0.01"),
      }
    );
    const currentBLockNum = await ethers.provider.getBlockNumber();
    const currentTimestamp = (await ethers.provider.getBlock(currentBLockNum)).timestamp;
    expect(await NFT.getIdForAccount(adminAddress)).to.eq(1);
    expect(await NFT.getVerifyCodeForId(1)).to.eq(SIGNATURE.verificationId);
    const newTimestamp = ethers.BigNumber.from(await NFT.getTimestampforId(1));
    console.log(currentTimestamp, "->", newTimestamp);
    console.log(newTimestamp);
    expect(newTimestamp.eq(currentTimestamp)).to.eq(true);
  });
});
