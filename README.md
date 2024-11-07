# Ransomware Recovery Service

A command-line tool built using the Accord Project template to parse and execute ransomware recovery service contracts. This tool utilizes Accord Project's JavaScript API for Concerto and Ergo to create computable legal contracts.

## Table of Contents

- [Overview](#overview)
- [Objective and Scope](#objective-and-scope)
- [Technical Requirements](#technical-requirements)
- [Project Components](#project-components)
  - [Ransomed File Setup](#ransomed-file-setup)
  - [Contract Template Creation](#contract-template-creation)
  - [Data Modeling with Concerto](#data-modeling-with-concerto)
  - [Contract Logic with Ergo](#contract-logic-with-ergo)
  - [Command Line Interface](#command-line-interface)
- [Development Steps](#development-steps)
- [Testing and Validation](#testing-and-validation)
- [Usage Guide](#usage-guide)
- [Project Structure](#project-structure)
- [License](#license)

## Overview

This project provides a command-line tool for processing ransomware recovery contracts using the Accord Project framework. The tool converts legal contracts into executable code that can automate the contract execution process.

## Objective and Scope

- **Tool**: A command-line application that processes ransomware recovery contracts
- **Framework**: Leverages the Accord Project to convert contracts into computable, executable code
- **Goal**: Transform text-based ransomware recovery service contracts into executable format for automated processing

## Technical Requirements

- **Programming Language**: JavaScript (Node.js)
- **Frameworks and Libraries**:
  - **Accord Project Concerto** for data modeling
  - **Ergo** for contract logic implementation
  - **Commander.js** for CLI implementation
  - **crypto** for file hashing and commitment generation
- **Input/Output**:
  - **Input**: Text-based ransomware recovery service contract and ransomed file
  - **Output**: Computed contract outcomes in JSON format

## Project Components

### Ransomed File Setup

- **Objective**: Simulate a scenario where a file has been ransomed and the attacker has left a commitment to the ransomed file
- **Components**:
  - Create a sample file that will be "ransomed"
  - Generate a cryptographic commitment representing the ransomed file (e.g., using a hash function)
  - Store the commitment as part of the contract details to demonstrate a realistic ransomware scenario
- **Implementation**:

  ```bash
  # Create sample ransomed file
  echo "Important company data - encrypted by ransomware" > ransom-note.txt

  # Generate commitment using Node.js
  node -e "
    const crypto = require('crypto');
    const fs = require('fs');
    const content = fs.readFileSync('ransom-note.txt');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    fs.writeFileSync('commitment.txt', hash);
    console.log('File commitment:', hash);
  "
  ```

- **CLI Integration**:

  ```bash
  # Command to generate file commitment
  recover-cli generate-commitment --file ransom-note.txt --output commitment.txt

  # Command to verify file against commitment
  recover-cli verify-commitment --file ransom-note.txt --commitment commitment.txt
  ```

### Contract Template Creation

- **Objective**: Define the structure and format of ransomware recovery contracts
- **Components**:
  - Contract template file (`.tem`)
  - Grammar definition for contract parsing
  - Sample contract instances for testing

### Data Modeling with Concerto

```concerto
namespace org.accordproject.ransomware

participant Party identified by partyId {
  o String partyId
  o String name
}

asset Contract identified by contractId {
  o String contractId
  o DateTime contractDate
  o Party provider
  o Party client
  o Double ransomAmount
  o String fileCommitment
  o String recoveryPlan
}

transaction RecoveryRequest {
  o String fileHash
}

transaction RecoveryResponse {
  o String status
  o String recoveryPlan
}
```

### Contract Logic with Ergo

```ergo
contract RansomwareRecovery over Contract {
  clause recover(request : RecoveryRequest) : RecoveryResponse {
    enforce request.fileHash = contract.fileCommitment
    else throw Error{ message: "File commitment mismatch" };

    return RecoveryResponse{
      status: "APPROVED",
      recoveryPlan: contract.recoveryPlan
    }
  }
}
```

### Command Line Interface

The CLI tool provides the following commands:

```bash
# Initialize a new contract
recover-cli init --template /path/to/template.tem --output contract.json

# Generate file commitment
recover-cli generate-commitment --file ransom-note.txt --output commitment.txt

# Execute a contract clause
recover-cli execute --contract contract.json --clause recover --input request.json

# Validate a contract
recover-cli validate --contract contract.json
```

## Development Steps

1. **Project Setup**

   ```bash
   npm init
   npm install @accordproject/cicero-core @accordproject/cicero-cli commander crypto
   ```

2. **Implementation Order**:
   - Implement file commitment generation utilities
   - Create contract template and model
   - Implement Ergo logic
   - Develop CLI interface
   - Add validation and error handling
   - Create test suite

## Testing and Validation

- **Unit Tests**:
  - Test file commitment generation and verification
  - Test template parsing and logic execution
- **Integration Tests**: Test complete contract execution flow
- **Validation Tests**: Verify contract compliance and error handling

## Usage Guide

```bash
# Generate commitment for ransomed file
recover-cli generate-commitment --file ransom-note.txt --output commitment.txt

# Create a new contract from template
recover-cli init --template ransomware-template.tem --params params.json --output contract.json

# Execute contract recovery clause
recover-cli execute --contract contract.json --clause recover --input recovery-request.json --output result.json

# View execution results
cat result.json
```

## Project Structure

```
ransomware-recovery-service/
├── bin/
│   └── recover-cli.js
├── src/
│   ├── utils/
│   │   └── commitment.js
│   ├── templates/
│   │   └── ransomware-template.tem
│   ├── models/
│   │   └── model.cto
│   └── logic/
│       └── logic.ergo
├── test/
│   ├── commitment.test.js
│   ├── contract.test.js
│   └── cli.test.js
├── package.json
└── README.md
```

## License

This project is licensed under the [MIT License](LICENSE).

---

Built with the Accord Project framework for creating and executing computable legal contracts.
