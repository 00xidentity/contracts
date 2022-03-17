import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  eu,
  GOOD_SIGNER_INDEX,
  createLegatoIDInstance as createKycIdInstance,
  makeSig,
  makeSigREAL,
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

  it("works with signature 1", async () => {
    const { NFT, adminAddress } = await createKycIdInstance(
      GOOD_SIGNER.address
    );

    cl("sig 1");
    // ---<unSuccessfull mint with WRONG signer---
    const SIGNATURE_1 = await makeSig(NFT, adminAddress);
    expect(await NFT.balanceOf(adminAddress)).to.eq(0);
    await expect(
      NFT.mint(SIGNATURE_1.expireBlock, SIGNATURE_1.signed_WRONGSigner, {
        value: eu.parseEther("0.01"),
      })
    ).to.be.revertedWith("Invalid signer");
    expect(await NFT.balanceOf(adminAddress)).to.eq(0);

    // ---<Successfull mint with good signer---
    await NFT.mint(SIGNATURE_1.expireBlock, SIGNATURE_1.signedCorrectSigner, {
      value: eu.parseEther("0.01"),
    });
    expect(await NFT.balanceOf(adminAddress)).to.eq(1);

    // ---<unSuccessfull mint due to wrong signer---
    await EXPECT_REVERT(
      NFT.mint(SIGNATURE_1.expireBlock, SIGNATURE_1.signedCorrectSigner, {
        value: eu.parseEther("0.01"),
      })
    ).to.be.revertedWith("Invalid signer"); // due to nonce changing

    // ---<unSuccessfull mint since already minted once even with valid signature---
    const SECOND_VALID_SIG = await makeSig(NFT, adminAddress);
    await EXPECT_REVERT(
      NFT.mint(
        SECOND_VALID_SIG.expireBlock,
        SECOND_VALID_SIG.signedCorrectSigner,
        {
          value: eu.parseEther("0.01"),
        }
      )
    ).to.be.revertedWith("Balance"); // due to nonce changing
    expect(await NFT.balanceOf(adminAddress)).to.eq(1);

    cl("sig 2");
    // ---<unSuccessfull burn since signed by bad signer---
    const SIGNATURE_2 = await makeSig(NFT, adminAddress);
    await EXPECT_REVERT(
      NFT.burn(SIGNATURE_2.expireBlock, SIGNATURE_2.signed_WRONGSigner)
    ).to.be.revertedWith("Invalid signer");

    // ---<Successfull burn with signed by good signer---
    await NFT.burn(SIGNATURE_2.expireBlock, SIGNATURE_2.signedCorrectSigner);
    expect(await NFT.balanceOf(adminAddress)).to.eq(0);

    cl("sig 3");
    // ---<Successfull mint with good signature ---
    const SIGNATURE_3 = await makeSig(NFT, adminAddress);
    await NFT.mint(SIGNATURE_3.expireBlock, SIGNATURE_3.signedCorrectSigner, {
      value: eu.parseEther("0.01"),
    });
    expect(await NFT.balanceOf(adminAddress)).to.eq(1);

    // ---<UnSuccessfull Burn since same signature but nonce changed---
    await EXPECT_REVERT(
      NFT.burn(SIGNATURE_3.expireBlock, SIGNATURE_3.signedCorrectSigner)
    ).to.be.revertedWith("Invalid signer");

    // ---<Successfull Burn after balance is one with a good sig ---
    expect(await NFT.balanceOf(adminAddress)).to.eq(1);
    const SIGNATURE_4 = await makeSig(NFT, adminAddress);
    await NFT.burn(SIGNATURE_4.expireBlock, SIGNATURE_4.signedCorrectSigner);
    expect(await NFT.balanceOf(adminAddress)).to.eq(0);

    // ---<Burn after balance is zero with a good sig ---
    const SIGNATURE_5 = await makeSig(NFT, adminAddress);
    await EXPECT_REVERT(
      NFT.burn(SIGNATURE_5.expireBlock, SIGNATURE_5.signedCorrectSigner)
    ).to.be.revertedWith("balance");
  });
});
