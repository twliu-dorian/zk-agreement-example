# Ransomware Recovery Service Tool

A command-line tool built using the Accord Project framework for managing ransomware recovery contracts.

## Currently Implemented Features

### 1. System Setup (Attacker Mode)
```bash
node recovery-cli.js system-setup --victim 1234 --file ./files/secret.pem
```
This command:
- Generates a master key for encryption
- Encrypts the target file using AES-256-GCM
- Creates encryption_data_[victimId].json containing:
  - Victim ID
  - File ID
  - Encrypted file path
  - Commitment hash
- Stores master key in master_keys.json
- Deletes original file

### 2. Commitment Generation
```bash
node recovery-cli.js generate-commitment --file encryption_data_1234.json --output commitment.txt
```
This command:
- Extracts commitment from encryption data
- Saves commitment to specified output file
- Used to prepare for contract initialization

### 3. Contract Initialization
```bash
node recovery-cli.js init \
  --template ./templates/ransomware-template \
  --commitment ./commitment.txt \
  --victim 1234 \
  --attacker 5678 \
  --output contract.json
```

This command:
- Creates new contract instance
- Sets initial state to INIT
- Includes:
  - Contract parties (victim/attacker)
  - Payment amount (1.0 ETH)
  - File commitment
  - Contract state
# Model.cto created
# Logic.ergo created

## Features To Be Implemented to CLI

### 1. Decryption Key Verification
```bash
# Proposed command
node recovery-cli.js verify-key \
  --contract contract.json \
  --key <master_key> \
  --output updated-contract.json
```
This will:
- Load existing contract
- Hash provided key and compare with commitment
- Update contract state:
  - If match: INIT -> AWAITING_EVALUATION -> FINISH_EVALUATION
  - If no match: INIT -> AWAITING_EVALUATION (with error)
- Emit payment obligation if successful

### 2. Payment Processing
```bash
# Proposed command
node recovery-cli.js process-payment \
  --contract contract.json \
  --amount 1.0 \
  --currency ETH \
  --tx <transaction_id> \
  --output final-contract.json
```
This will:
- Verify payment amount matches contract
- Update contract state:
  - If successful: FINISH_EVALUATION -> COMPLETE
  - If failed: Remain in FINISH_EVALUATION (with error)
- Record transaction details

### 3. Contract State Transitions

Current State Flow:
```
[INIT] -> Contract created

To be implemented:
[INIT] -> [AWAITING_EVALUATION] : When key verification starts
       -> [FINISH_EVALUATION]   : When key verified successfully
       -> [COMPLETE]           : When payment processed
```

## Project Structure
```
/opt/Capstone/
├── recovery-cli.js              # Main CLI tool
├── package.json                 # Project dependencies
├── master_keys.json            # Stores encryption keys
├── templates/                  # Contract templates
│   └── ransomware-template/    
│       ├── model/             # Contract data model
│       ├── logic/             # Contract logic
│       └── text/              # Contract text templates
└── test/                      # Tests (to be implemented)
```

## Usage Flow
1. ✓ Attacker encrypts file (system-setup)
2. ✓ Commitment is generated (generate-commitment)
3. ✓ Contract is initialized (init)
4. ⚠️ Victim verifies key (verify-key) - To be implemented
5. ⚠️ Payment is processed (process-payment) - To be implemented

## State Management
Each state change is recorded in the contract JSON and includes:
- Current state
- State change timestamp
- Last action
- Error messages (if any)
- Payment status

## Installation & Setup
```bash
git clone [repository]
cd /opt/Capstone
npm install
./clean-install.sh  # Ensures correct dependency versions
```

## Testing
```bash
# To be implemented
npm test
```
