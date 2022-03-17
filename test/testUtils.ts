import { ethers } from "hardhat";

export async function makeSigREAL(contractAddress: string, sender: string) {
  const eu = ethers.utils;
  const prov = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");
  const signerpk = process.env.SIGNER_PK || "";
  console.log("pk was " + signerpk);
  const signer = new ethers.Wallet(signerpk);
  const expireBlock = prov.blockNumber + 20;
  const contract = new ethers.Contract(
    contractAddress,
    ["function nonces(address what) public view returns (uint256)"],
    prov
  );
  const nonce = await contract.nonces(sender);
  console.log("-> JS: expireblock: ", expireBlock);
  console.log("-> JS: nonce: ", nonce);
  console.log("-> JS: sender ", sender);
  console.log("-> JS: good signer ", signer.address);
  const { chainId } = await prov.getNetwork();

  const packed = eu.solidityKeccak256(
    ["address", "uint256", "address", "uint256", "uint256"],
    [sender, expireBlock, contract.address, nonce, chainId]
  );
  const packedBytes = eu.arrayify(packed);
  const signedMessage = await signer.signMessage(packedBytes);
  return signedMessage;
}
export async function createLegatoIDInstance(signer: string) {
  const nftContract = await ethers.getContractFactory("LegatoID");
  const nft = await nftContract.deploy(signer);
  await nft.deployed();
  const [admin, nonAdmin, thirdAccount] = await ethers.getSigners();
  const AS_NON_ADMIN_SIGNER = nft.connect(nonAdmin);
  return {
    NFT: nft,
    AS_NON_ADMIN_SIGNER,
    nonAdminAddress: nonAdmin.address,
    adminAddress: admin.address,
    thirdAccountAddress: thirdAccount.address,
  };
}
export const GOOD_SIGNER_INDEX = 2;
export const BAD_SIGNER_INDEX = 1;

export async function makeSig(theNFT: any, sender: string) {
  const signers = await ethers.getSigners();
  const GOOD_SIGNER = signers[GOOD_SIGNER_INDEX];
  const BAD_SIGNER = signers[BAD_SIGNER_INDEX];
  const expireBlock = ethers.provider.blockNumber + 20;
  const nonce = await theNFT.nonces(sender);
  console.log("-> JS: expireblock: ", expireBlock);
  console.log("-> JS: nonce: ", nonce);
  console.log("-> JS: sender ", sender);
  console.log("-> JS: good signer ", GOOD_SIGNER.address);
  console.log("-> JS: bad signer ", BAD_SIGNER.address);
  const { chainId } = await ethers.provider.getNetwork();

  const packed = eu.solidityKeccak256(
    ["address", "uint256", "address", "uint256", "uint256"],
    [sender, expireBlock, theNFT.address, nonce, chainId]
  );
  const packedBytes = eu.arrayify(packed);
  const signedCorrectSigner = await GOOD_SIGNER.signMessage(packedBytes);
  const signedWrongSigner = await BAD_SIGNER.signMessage(packedBytes);
  return {
    signedCorrectSigner,
    signed_WRONGSigner: signedWrongSigner,
    expireBlock,
    nonce,
  };
}
export async function mineRealBlocks(n: number) {
  for (let index = 0; index < n; index++) {
    await ethers.provider.send("evm_mine", []);
  }
}
export async function mineFakeBlocks(n: number) {
  await ethers.provider.send("hardhat_mine", [
    ethers.utils.hexValue(n).toString(),
  ]);
}
export const eu = ethers.utils;
