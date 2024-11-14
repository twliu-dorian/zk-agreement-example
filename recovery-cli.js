#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Command } = require('commander');
const CiceroCore = require('@accordproject/cicero-core');
const Template = CiceroCore.Template;
const Clause = CiceroCore.Clause;

const Engine = require('@accordproject/cicero-engine').Engine;

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

            // Create contract data
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
                    '$class': 'org.accordproject.money.MonetaryAmount',
                    'doubleValue': 1.0,
                    'currencyCode': 'USD'  // Using USD as currency code
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

            console.log('Contract initialization complete:');
            console.log('- Contract created with ID:', contractId);
            console.log('- Contract created for victim:', options.victim);
            console.log('- Saved to:', options.output);

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
                .update(Buffer.from(options.key, 'hex'))  // Convert hex string to buffer
                .digest('hex');
            
            console.log('Generated hash for provided key:', keyHash);

            const template = await Template.fromDirectory('./templates/ransomware-template');
            console.log('Template loaded successfully');

            // Create request data with proper class names
            const request = {
                '$class': 'org.accordproject.ransomware.recovery.KeySubmissionRequest',
                'key': keyHash
            };

            // Create contract data with proper class structure
            const contractData = {
                '$class': 'org.accordproject.ransomware.recovery.RansomwareContract',
                ...contractJson.contract,
                'paymentAmount': {
                    '$class': 'org.accordproject.money.MonetaryAmount',
                    'doubleValue': contractJson.contract.paymentAmount.doubleValue,
                    'currencyCode': contractJson.contract.paymentAmount.currencyCode
                }
            };

            // Create state data with proper class structure
            const stateData = {
                '$class': 'org.accordproject.ransomware.recovery.RansomwareContractState',
                'status': contractJson.state.status,
                'message': contractJson.state.message
            };

            const clause = new Clause(template);
            await clause.setData(contractData);

            const engine = new Engine();
            const result = await engine.trigger(clause, request, stateData);

            // Update contract with new state and submitted key
            const updatedContract = {
                contract: {
                    ...contractData,
                    submittedKey: keyHash,
                    status: 'AWAITING_EVALUATION'
                },
                state: {
                    '$class': 'org.accordproject.ransomware.recovery.RansomwareContractState',
                    status: 'AWAITING_EVALUATION',
                    message: 'Key submitted, awaiting validation'
                }
            };

            await fs.writeFile(options.output, JSON.stringify(updatedContract, null, 2));

            console.log('\nKey submission result:');
            console.log('- Hash Generated:', keyHash);
            console.log('- Success:', result.response.success);
            console.log('- Message:', result.response.message);
            console.log('- New State:', updatedContract.state.status);

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

            console.log('\nValidation result:');
            console.log('- Success:', result.response.success);
            console.log('- Message:', result.response.message);
            console.log('- Final State:', updatedContract.state.status);

            if (result.response.success) {
                console.log('- Payment obligation has been emitted');
            }

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
    .description('Decrypt a file using the provided key')
    .requiredOption('--file <path>', 'Path to encrypted file')
    .requiredOption('--key <string>', 'Decryption key')
    .requiredOption('--victim <id>', 'Victim ID')
    .requiredOption('--output <path>', 'Output path for decrypted file')
    .action(async (options) => {
        try {
            // Read encrypted file
            const encryptedData = await fs.readFile(options.file);
            
            // Extract IV, auth tag, and encrypted content
            const iv = encryptedData.slice(0, 16);
            const authTag = encryptedData.slice(16, 32);
            const encryptedContent = encryptedData.slice(32);
            
            // Generate file-specific decryption key
            const fileId = crypto.createHash('sha256')
                .update(options.file)
                .digest('hex');
            
            const decryptionKey = crypto.createHash('sha256')
                .update(Buffer.concat([
                    Buffer.from(options.key, 'hex'),
                    Buffer.from(options.victim),
                    Buffer.from(fileId)
                ]))
                .digest();
            
            // Create decipher
            const decipher = crypto.createDecipheriv('aes-256-gcm', decryptionKey, iv);
            decipher.setAuthTag(authTag);
            
            // Decrypt the data
            let decrypted = decipher.update(encryptedContent);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            
            // Write decrypted file
            await fs.writeFile(options.output, decrypted);
            
            console.log('File decryption complete:');
            console.log('- Decrypted file saved to:', options.output);
            
            return true;
        } catch (error) {
            console.error('Error during file decryption:', error.message);
            process.exit(1);
        }
    });

program.parse(process.argv);