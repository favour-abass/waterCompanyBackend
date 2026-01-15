// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title WaterPackTracker
 * @dev Smart contract for tracking water pack lifecycle on Ethereum blockchain
 */
contract WaterPackTracker {
    
    // Enums for status tracking
    enum Status { 
        CREATED, 
        INSPECTOR, 
        APPROVED, 
        REJECTED_CONTAMINATED,
        REJECTED_EXPIRED,
        DISTRIBUTED, 
        SOLD 
    }
    
    // Struct to hold water pack data
    struct WaterPack {
        string serialCode;
        Status status;
        address createdBy;
        address lastModifiedBy;
        uint256 createdAt;
        uint256 lastModifiedAt;
        string rejectionReason;
        bool exists;
    }
    
    // Mapping from serial code to water pack
    mapping(string => WaterPack) public waterPacks;
    
    // Array to store all serial codes
    string[] public allSerialCodes;
    
    // Role management
    mapping(address => bool) public admins;
    mapping(address => bool) public inspectors;
    
    // Contract owner
    address public owner;
    
    // Events for tracking changes
    event WaterPackCreated(string serialCode, address createdBy, uint256 timestamp);
    event WaterPackMovedToInspector(string serialCode, address movedBy, uint256 timestamp);
    event WaterPackApproved(string serialCode, address approvedBy, uint256 timestamp);
    event WaterPackRejected(string serialCode, address rejectedBy, string reason, uint256 timestamp);
    event WaterPackDistributed(string serialCode, address distributedBy, uint256 timestamp);
    event WaterPackSold(string serialCode, address soldBy, uint256 timestamp);
    event AdminAdded(address admin);
    event InspectorAdded(address inspector);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "Only admin can perform this action");
        _;
    }
    
    modifier onlyInspectorOrAdmin() {
        require(
            inspectors[msg.sender] || admins[msg.sender] || msg.sender == owner,
            "Only inspector or admin can perform this action"
        );
        _;
    }
    
    modifier waterPackExists(string memory serialCode) {
        require(waterPacks[serialCode].exists, "Water pack does not exist");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }
    
    /**
     * @dev Add an admin
     */
    function addAdmin(address _admin) external onlyOwner {
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }
    
    /**
     * @dev Add an inspector
     */
    function addInspector(address _inspector) external onlyAdmin {
        inspectors[_inspector] = true;
        emit InspectorAdded(_inspector);
    }
    
    /**
     * @dev Create a new water pack
     */
    function createWaterPack(string memory serialCode) external onlyAdmin {
        require(!waterPacks[serialCode].exists, "Water pack already exists");
        
        waterPacks[serialCode] = WaterPack({
            serialCode: serialCode,
            status: Status.CREATED,
            createdBy: msg.sender,
            lastModifiedBy: msg.sender,
            createdAt: block.timestamp,
            lastModifiedAt: block.timestamp,
            rejectionReason: "",
            exists: true
        });
        
        allSerialCodes.push(serialCode);
        
        emit WaterPackCreated(serialCode, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Move water pack to inspector stage
     */
    function moveToInspector(string memory serialCode) 
        external 
        onlyInspectorOrAdmin 
        waterPackExists(serialCode) 
    {
        WaterPack storage pack = waterPacks[serialCode];
        require(pack.status == Status.CREATED, "Water pack must be in CREATED status");
        
        pack.status = Status.INSPECTOR;
        pack.lastModifiedBy = msg.sender;
        pack.lastModifiedAt = block.timestamp;
        
        emit WaterPackMovedToInspector(serialCode, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Approve water pack
     */
    function approveWaterPack(string memory serialCode) 
        external 
        onlyAdmin 
        waterPackExists(serialCode) 
    {
        WaterPack storage pack = waterPacks[serialCode];
        require(pack.status == Status.INSPECTOR, "Water pack must be in INSPECTOR status");
        
        pack.status = Status.APPROVED;
        pack.lastModifiedBy = msg.sender;
        pack.lastModifiedAt = block.timestamp;
        
        emit WaterPackApproved(serialCode, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Reject water pack
     */
    function rejectWaterPack(string memory serialCode, string memory reason) 
        external 
        onlyAdmin 
        waterPackExists(serialCode) 
    {
        WaterPack storage pack = waterPacks[serialCode];
        
        // Set status based on reason
        if (keccak256(bytes(reason)) == keccak256(bytes("CONTAMINATED"))) {
            pack.status = Status.REJECTED_CONTAMINATED;
        } else if (keccak256(bytes(reason)) == keccak256(bytes("EXPIRED"))) {
            pack.status = Status.REJECTED_EXPIRED;
        } else {
            revert("Invalid rejection reason");
        }
        
        pack.rejectionReason = reason;
        pack.lastModifiedBy = msg.sender;
        pack.lastModifiedAt = block.timestamp;
        
        emit WaterPackRejected(serialCode, msg.sender, reason, block.timestamp);
    }
    
    /**
     * @dev Mark water pack as distributed
     */
    function distributeWaterPack(string memory serialCode) 
        external 
        onlyAdmin 
        waterPackExists(serialCode) 
    {
        WaterPack storage pack = waterPacks[serialCode];
        require(pack.status == Status.APPROVED, "Water pack must be approved first");
        
        pack.status = Status.DISTRIBUTED;
        pack.lastModifiedBy = msg.sender;
        pack.lastModifiedAt = block.timestamp;
        
        emit WaterPackDistributed(serialCode, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Mark water pack as sold
     */
    function sellWaterPack(string memory serialCode) 
        external 
        onlyAdmin 
        waterPackExists(serialCode) 
    {
        WaterPack storage pack = waterPacks[serialCode];
        require(pack.status == Status.DISTRIBUTED, "Water pack must be distributed first");
        
        pack.status = Status.SOLD;
        pack.lastModifiedBy = msg.sender;
        pack.lastModifiedAt = block.timestamp;
        
        emit WaterPackSold(serialCode, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Get water pack details (PUBLIC - anyone can verify)
     */
    function verifyWaterPack(string memory serialCode) 
        external 
        view 
        returns (
            string memory serial,
            Status status,
            address createdBy,
            uint256 createdAt,
            uint256 lastModifiedAt,
            string memory rejectionReason
        ) 
    {
        require(waterPacks[serialCode].exists, "Water pack not found");
        
        WaterPack memory pack = waterPacks[serialCode];
        return (
            pack.serialCode,
            pack.status,
            pack.createdBy,
            pack.createdAt,
            pack.lastModifiedAt,
            pack.rejectionReason
        );
    }
    
    /**
     * @dev Get total number of water packs
     */
    function getTotalWaterPacks() external view returns (uint256) {
        return allSerialCodes.length;
    }
    
    /**
     * @dev Get serial code by index
     */
    function getSerialCodeByIndex(uint256 index) external view returns (string memory) {
        require(index < allSerialCodes.length, "Index out of bounds");
        return allSerialCodes[index];
    }
}