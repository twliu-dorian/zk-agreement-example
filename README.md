# Ransomware Recovery Service Tool
A command-line tool built using the Accord Project framework for managing ransomware recovery contracts.
## Implemented Features
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
- Model.cto created
- Logic.ergo created
### 4. Decryption Key Submission
```bash
node recovery-cli.js submit-key \
  --contract contract.json \
  --key <master_key> \
  --output updated-contract.json
```
This command:
- Loads existing contract
- Hashes provided key
- Updates contract state:
  - INIT -> AWAITING_EVALUATION
  - Stores hashed key in contract
- Saves updated contract
### 5. Decryption Key Validation
```bash
node recovery-cli.js validate \
  --contract contract.json \
  --output final-contract.json
```
This command:
- Loads contract
- Compares stored hashed key with commitment
- Updates contract state:
  - If match: AWAITING_EVALUATION -> COMPLETE
  - If no match: AWAITING_EVALUATION -> FINISH_EVALUATION (with error)
- Emits payment obligation if successful
- Saves updated contract
### 6. File Decryption
```bash
node recovery-cli.js decrypt \
  --contract contract.json \
  --victim 1234 \
  --output decrypted-file.txt
```
This command:
- Loads contract
- Checks contract state is COMPLETE
- Retrieves master key from contract
- Reads encrypted file path from encryption_data_[victimId].json
- Decrypts file using master key and victim ID
- Saves decrypted file to output path
## Contract State Transitions
```
[INIT] -> Contract created
[INIT] -> [AWAITING_EVALUATION] : When key submitted
       -> [FINISH_EVALUATION]   : When key validation fails
       -> [COMPLETE]           : When key validated successfully
```
## Project Structure
```
/opt/Capstone/
├── recovery-cli.js              # Main CLI tool
├── package.json                 # Project dependencies
├── master_keys.json             # Stores encryption keys
├── templates/                   # Contract templates
│   └── ransomware-template/    
│       ├── model/               # Contract data model
│       ├── logic/               # Contract logic
│       └── text/                # Contract text templates
└── test/                        # Tests (to be implemented)
```
## Usage Flow
1. ✓ Attacker encrypts file (system-setup)
2. ✓ Commitment is generated (generate-commitment)
3. ✓ Contract is initialized (init)
4. ✓ Victim submits decryption key (submit-key)
5. ✓ Key is validated against commitment (validate)
6. ✓ File is decrypted using master key (decrypt)
## State Management
Each state change is recorded in the contract JSON and includes:
- Current state
- State change timestamp
- Last action
- Error messages (if any)
- Payment status

Everything mentioned in the README file has been implemented successfully in the ransomware recovery service tool. The tool now supports the complete flow from system setup to file decryption, with proper contract state management and transitions. The README reflects the current state of the project accurately.
