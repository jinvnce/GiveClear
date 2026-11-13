export const GIVECLEAR_ABI = [
  "function campaignCount() view returns (uint256)",
  "function campaigns(uint256) view returns (string name, string organization, string purpose, address organizer, uint256 raised, uint256 spent, bool active)",
  "function createDrive(string name, string organization, string purpose) returns (uint256)",
  "function updateDrive(uint256 id, string name, string organization, string purpose)",
  "function setDriveActive(uint256 id, bool active)",
  "function donate(uint256 campaignId, uint256 amount)",
  "function equivalentGas(uint256 amount) view returns (uint256)",
  "function requests(uint256) view returns (uint256 campaignId, uint256 amount, address recipient, bytes32 receiptHash, string purpose, uint8 status, string note)",
  "function approveRequest(uint256 requestId, string note)",
  "function rejectRequest(uint256 requestId, string note)",
];
