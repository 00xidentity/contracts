// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
// import "./IUniqueIdentity.sol";
import "hardhat/console.sol";

/**
 * @title UniqueIdentity
 * @notice LegatoID is based on the work of GOldfinch's UniqueIdentity token.
 * it is an ERC721-compliant contract for representing
 * the identity verification status of addresses.
 * @author Roy Osherove
 */

// contract UniqueIdentity is ERC1155PresetPauserUpgradeable, IUniqueIdentity {
// IUniqueIdentity,
contract IdentityCard is Ownable, ReentrancyGuard, AccessControl, ERC721 {
    using Counters for Counters.Counter;
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant ID_OWNER_ROLE = keccak256("ID_OWNER_ROLE");

    uint256 public constant MINT_COST_PER_TOKEN = 830000 gwei;

    /// @dev We include a nonce in every hashed message, and increment the nonce as part of a
    /// state-changing operation, so as to prevent replay attacks, i.e. the reuse of a signature.
    mapping(address => uint256) public nonces;
    mapping(address => uint256) internal idsToOwners;
    mapping(uint256 => string) internal verifyCodesToIds;
    mapping(uint256 => uint256) internal timeStampToIds; // id -> timestamp

    Counters.Counter private _tokenIdCounter;

    // constructor() override(Ownable, ReentrancyGuard) {}
    constructor(address signer)
        Ownable()
        ReentrancyGuard()
        AccessControl()
        ERC721("Legato ID", "LID")
    {
        require(owner() != address(0), "Owner address cannot be empty");
        _setupRole(SIGNER_ROLE, owner());
        _setupRole(SIGNER_ROLE, signer);
        console.log("SOL: owner: ", owner());
        console.log("SOL: signer: ", signer);
        // _setRoleAdmin(SIGNER_ROLE, ID_OWNER_ROLE);
        // _setRoleAdmin(ID_OWNER_ROLE, ID_OWNER_ROLE);
    }

    function getNonce(address forAddress) public view returns (uint256) {
        return nonces[forAddress];
    }

    function mint(
        uint256 expiresAt,
        bytes calldata signature,
        string calldata verificationId
    )
        public
        payable
        notContract
        onlySigner(_msgSender(), expiresAt, signature, verificationId)
        incrementNonce(_msgSender())
        nonReentrant
    {
        require(
            msg.value >= MINT_COST_PER_TOKEN,
            "Not enough ETH value for minting"
        );
        _tokenIdCounter.increment();
        uint256 newID = _tokenIdCounter.current();
        require(balanceOf(_msgSender()) == 0, "Balance before mint must be 0");
        _mint(_msgSender(), newID);
        idsToOwners[_msgSender()] = newID;
        timeStampToIds[newID] = block.timestamp;
        verifyCodesToIds[newID] = verificationId;
    }

    function getIdForAccount(address _for) public view returns (uint256 id) {
        return idsToOwners[_for];
    }
    function getVerifyCodeForId(uint256 _id) public view returns (string memory verificationCode) {
        return verifyCodesToIds[_id];
    }
    function getTimestampforId(uint256 _id) public view returns (uint256 timestamp) {
        return timeStampToIds[_id];
    }

    function burn(uint256 expiresAt, bytes calldata signature,string memory verificationId)
        public
        notContract
        onlySigner(_msgSender(), expiresAt, signature, verificationId)
        incrementNonce(_msgSender())
    {
        require(
            balanceOf(_msgSender()) > 0,
            "must have balance above zero to burn"
        );
        _burn(idsToOwners[_msgSender()]);
        delete idsToOwners[_msgSender()];

        uint256 accountBalance = balanceOf(_msgSender());
        require(accountBalance == 0, "Balance after burn must be 0");
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721) {
        require(
            (from == address(0) && to != address(0)) ||
                (from != address(0) && to == address(0)),
            "Only mint or burn transfers are allowed"
        );
        super._beforeTokenTransfer(from, to, tokenId);
    }

    modifier notContract() {
        require(!_isContract(_msgSender()), "contract not allowed");
        require(_msgSender() == tx.origin, "proxy contract not allowed");
        _;
    }

    /**
     * @notice Checks if address is a contract
     * @dev It prevents contract from being targetted
     */
    function _isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }

    modifier onlySigner(
        address account,
        uint256 expiresAt,
        bytes calldata signature,
        string memory verificationId
    ) {
        require(block.number < expiresAt, "Signature has expired");

        console.log("SOL: nonce ", nonces[account]);
        console.log("SOL: expire block ", expiresAt);
        console.log("SOL: current block ", block.number);
        console.log("SOL: chain ", block.chainid);
        console.log("SOL: verificationId", verificationId);
        bytes32 hash = keccak256(
            abi.encodePacked(
                account,
                expiresAt,
                address(this),
                nonces[account],
                block.chainid,
                verificationId
            )
        );
        bytes32 ethSignedMessage = ECDSA.toEthSignedMessageHash(hash);
        address recovered = ECDSA.recover(ethSignedMessage, signature);
        console.log("SOL: sender: ", _msgSender());
        console.log("SOL: recovered: ", recovered);
        require(hasRole(SIGNER_ROLE, recovered), "Invalid signer");
        _;
    }

    modifier incrementNonce(address account) {
        nonces[account] += 1;
        _;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
