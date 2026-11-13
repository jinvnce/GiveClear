export const GIVECLEAR_ABI = [
  "function campaignCount() view returns (uint256)",
  "function requestCount() view returns (uint256)",
  "function campaigns(uint256) view returns (string name, string organization, string purpose, address organizer, uint256 raised, uint256 spent, bool active)",
  "function requests(uint256) view returns (uint256 campaignId, uint256 amount, address recipient, bytes32 receiptHash, string purpose, uint8 status, string note)",
  "function donate(uint256 campaignId, uint256 amount)",
  "function equivalentGas(uint256 amount) view returns (uint256)",
  "function createDrive(string name, string organization, string purpose) returns (uint256)",
  "function updateDrive(uint256 id, string name, string organization, string purpose)",
  "function setDriveActive(uint256 id, bool active)",
  "function submitRequest(uint256 campaignId, uint256 amount, address recipient, bytes32 receiptHash, string purpose) returns (uint256)",
  "event CampaignCreated(uint256 indexed id, string name, string organization, address organizer)",
  "event CampaignUpdated(uint256 indexed id, string name, string organization, string purpose)",
  "event CampaignStatusChanged(uint256 indexed id, bool active)",
  "event Donated(uint256 indexed campaignId, address indexed donor, uint256 amount)",
  "event RequestSubmitted(uint256 indexed requestId, uint256 indexed campaignId, uint256 amount, address recipient, bytes32 receiptHash)",
  "event Released(uint256 indexed requestId, uint256 indexed campaignId, address recipient, uint256 amount, string note)",
];

export const TOKEN_ABI = [
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];
