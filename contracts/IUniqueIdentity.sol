// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;
// interface IUniqueIdentity is IERC1155Upgradeable {
interface IUniqueIdentity {
  function mint(
    uint256 expiresAt,
    bytes calldata signature
  ) external payable;

  function burn(
    address account,
    uint256 id,
    uint256 expiresAt,
    bytes calldata signature
  ) external;
}