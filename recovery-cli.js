const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Command } = require('commander');
const CiceroCore = require('@accordproject/cicero-core');
const Template = CiceroCore.Template;

async function initializeContract(templatePath, commitmentPath, victimId, attackerId, outputPath) {
    try {
        // Read commitment
        const commitment = await fs.readFile(commitmentPath, 'utf8');
        console.log('Commitment loaded:', commitment.trim());

        // Load template
        console.log('Loading template from:', templatePath);
        const template = await Template.fromDirectory(templatePath);
        console.log('Template loaded successfully');

        // Generate contract ID
        const contractId = crypto.randomBytes(16).toString('hex');

        // Create contract data
        const data = {
            '$class': 'org.accordproject.ransomware.recovery.RansomwareContract',
            'contractId': contractId,
            'buyer': {
                '$class': 'org.accordproject.ransomware.recovery.ContractParty',
                'partyId': victimId,
                'name': `Victim ${victimId}`
            },
            'seller': {
                '$class': 'org.accordproject.ransomware.recovery.ContractParty',
                'partyId': attackerId,
                'name': `Attacker ${attackerId}`
            },
            'paymentAmount': {
                '$class': 'org.accordproject.money.MonetaryAmount',
                'doubleValue': 1.0,
                'currencyCode': 'ETH'
            },
            'fileCommitment': commitment.trim()
        };

        // Create initial state
        const state = {
            '$class': 'org.accordproject.ransomware.recovery.RansomwareContractState',
            'status': 'CREATED'
        };

        // Create contract JSON
        const contractJson = {
            data: data,
            state: state
        };

        // Write to file
        await fs.writeFile(outputPath, JSON.stringify(contractJson, null, 2));

        console.log('Contract initialization complete:');
        console.log('- Contract created with ID:', contractId);
        console.log('- Contract created for victim:', victimId);
        console.log('- Saved to:', outputPath);

        return contractJson;
    } catch (error) {
        throw new Error(`Contract initialization failed: ${error.message}`);
    }
}

// Setup Commander.js
const program = new Command();

program
    .name('recovery-cli')
    .description('Ransomware Recovery Service CLI')
    .version('1.0.0');

// Initialize contract command
program
    .command('init')
    .description('Initialize a new ransomware recovery contract')
    .requiredOption('--template <path>', 'Path to template directory')
    .requiredOption('--commitment <path>', 'Path to commitment file')
    .requiredOption('--victim <id>', 'Victim ID')
    .requiredOption('--attacker <id>', 'Attacker ID')
    .requiredOption('--output <path>', 'Output contract JSON path')
    .action(async (options) => {
        try {
            await initializeContract(
                options.template,
                options.commitment,
                options.victim,
                options.attacker,
                options.output
            );
        } catch (error) {
            console.error('Error:', error.message);
            if (error.stack) console.error('Stack:', error.stack);
            process.exit(1);
        }
    });

program.parse(process.argv);