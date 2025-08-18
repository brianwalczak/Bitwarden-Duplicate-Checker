const { MultiSelect, prompt } = require('enquirer');
const chalk = require('chalk');
const fs = require('fs');
let vault;
let fileLocation;

const getFile = async() => {
	await prompt({
		type: 'input',
		name: 'path',
		message: 'Please enter the path to your vault export file (unencrypted):',
		validate: (value) => {
			if (!fs.existsSync(value)) return chalk.bold('It looks like this file doesn\'t exist, please double-check your file location.');

			try {
				vault = JSON.parse(fs.readFileSync(value));
				if(!vault?.items) vault.items = [];

				fileLocation = value;
			} catch (error) {
				return chalk.bold('Failed to parse your JSON vault, please ensure it\'s a valid JSON file.');
			}

			return true;
		}
	});

	return vault;
};

async function getLoginDomains() {
    const domains = [];

	// Look for all domains and push them to an array (ignore duplicate domains)
    for (const account of vault.items) {
        const uris = account?.login?.uris;
        if (!uris?.length || !uris[0]?.uri) continue;

        try {
            const url = new URL(uris[0].uri); // Extract each domain from login
            const subDomain = url.hostname.replace(/^www\./i, ''); // Ignore www subdomain
            const apexDomain = subDomain.split('.').slice(-2).join('.'); // Convert sub domain to apex domain

            if (!domains.some(d => d.apexDomain === apexDomain && d.subDomain === subDomain)) {
                domains.push({ apexDomain, subDomain }); // Add domain to array if it doesn't exist
            }
        } catch {
			continue;
		}
    }

    return domains;
}

async function findDuplicates(domain, isApex = false) {
	const items = [];

	// Filter logins to look for domain occurrences (this is the list of accounts with that domain)
	let accounts = vault.items.filter(account => {
		try {
			if (!account?.login?.uris || account?.login?.uris.length === 0) return false;

			const url = new URL(account.login.uris[0].uri);
			let filter = url.hostname.replace(/^www\./i, '');
			if(isApex) filter = filter.split('.').slice(-2).join('.');
			
			return filter === domain;
		} catch {
			return false;
		}
	});

	// Check if a domain list has multiple accounts
	if(accounts.length > 1) {
		// Iterate through all accounts with the same domain
		for (let account of accounts) {
			// Check if username and password match with any other logins
			const accountList = accounts.filter(item => {
				const u = item?.login?.username?.toLowerCase();
				const p = item?.login?.password;
				const au = account?.login?.username?.toLowerCase();
				const ap = account?.login?.password;

				if (!u) return false; // Skip if username is missing
				if (u && u !== au) return false; // Check if username matches
				if (p && p !== ap) return false; // Check if password matches

				return true;
			});

			const duplicates = accountList.filter(item => item !== account);

			if(!isApex && duplicates.length > 0) {
				items.push({ account, duplicates }); // Add record to list of duplicates
			} else if(isApex && accountList.length > 1) { // > 1 accounts for single login
				items.push(accountList); // Add record to list of accounts (don't separate account and duplicates, treat all as "grouped" items)
			}

			accounts = accounts.filter(item => !accountList.includes(item)); // Remove account(s) to prevent re-iteration
		}
	}

	return items;
}

async function processDomains(domains, settings) {
	let detectedCount = 0;
	let deletedCount = 0;

	for (let domain of domains) {
		const { apexDomain, subDomain } = domain;

		if(!settings.includes('Root Domain Comparison')) {
			const entries = await findDuplicates(subDomain);

			for (const { account, duplicates } of entries) {
				console.log(chalk.yellow('[DETECTED]') + ` ${duplicates.length} duplicate(s) found for ${subDomain} with username ${chalk.bold(account?.login?.username?.toLowerCase() ?? '[NONE]')} and password ${chalk.bold(account?.login?.password ? (settings.includes('Show Passwords') ? account.login.password : '*'.repeat(account.login.password.length)) : '[NONE]')}...`);

				// Prompt user for confirmation, or automatically delete if setting was enabled
				let result;
				if (settings.includes('Automatic Deletion')) {
					result = 'y';
				} else {
					const { answer } = await prompt({
						type: 'input',
						name: 'answer',
						message: 'Would you like to delete all duplicates for this website (y/n)? '
					});

					result = answer.trim().toLowerCase();
				}
						
				if (result == 'y') {
					vault.items = vault.items.filter(item => !duplicates.includes(item));
					console.log(chalk.green("Duplicates for this login have been successfully deleted.\n\n"));

					deletedCount += duplicates.length;
				} else {
					console.log(chalk.yellow("Duplicates for this login have not been deleted.\n\n"));
				}

				detectedCount += duplicates.length;
			}
		} else {
			const entries = await findDuplicates(apexDomain, true);
			
			for (const accounts of entries) {
				console.log(chalk.yellow('[DETECTED]') + ` ${accounts.length} ${chalk.bold('possible')} duplicates found for the apex ${apexDomain}:`);

				const choices = accounts.map((item, index) => ({
					name: String(index),
					message: `Username: ${chalk.bold(item?.login?.username?.toLowerCase() ?? '[NONE]')} | Password: ${chalk.bold(item?.login?.password ? (settings.includes('Show Passwords') ? item.login.password : '*'.repeat(item.login.password.length)) : '[NONE]')} | Domain: ${chalk.bold(new URL(item.login.uris[0].uri).hostname)}`,
					value: index
				}));

				const results = await new MultiSelect({
					name: 'select',
					message: `Select all accounts you want to ${chalk.bold('delete')} for this apex domain (select all that apply, press space to select).`,
					choices: choices
				}).run();

				if(results.length === 0) {
					console.log(chalk.yellow("Duplicates for this apex domain have not been deleted.\n\n"));
				} else {
					for (const index of results) {
						if (accounts[Number(index)] !== undefined) {
							vault.items = vault.items.filter(item => item !== accounts[Number(index)]);
							
							deletedCount++;
						}
					}
					
					console.log(chalk.green("Duplicates for this apex domain have been successfully deleted.\n\n"));
				}

				detectedCount += accounts.length;
			}
		}
	}
	
	return { detectedCount, deletedCount };
};

function consoleHeader() {
	console.clear();
	console.log(chalk.bold.cyan("Bitwarden Duplicate Checker | Remove vault duplicates easily."));
	console.log("A CLI utility designed to scan for duplicate password entries in your Bitwarden vault export.\n");

	console.log(chalk.gray("Made with") + chalk.red(" ♡ ") + chalk.gray("by Briann — https://github.com/BrianWalczak") + '\n');
}

const main = async (isConfig) => {
	const settings = isConfig ? await new MultiSelect({ name: 'value', message: 'Please configure the settings below (select all that apply, press space to select).', choices: ['Root Domain Comparison', 'Save to Original File', 'Show Passwords'] }).run() : [];
	
	// force manual review for root domain comparison (to prevent data loss)
	if(!settings.includes('Root Domain Comparison')) {
		const { autoDelete } = await prompt({
			type: 'select',
			name: 'autoDelete',
			message: 'Would you like to automatically delete duplicated logins or manual review?',
			choices: ['Automatic Deletion', 'Manual Review']
		});

		settings.push(autoDelete);
	}

	consoleHeader();
	const domains = await getLoginDomains(settings);

	console.log(chalk.yellow(`Checking ${vault.items.length} accounts with ${domains.length} unique websites...\n`));
	const process = await processDomains(domains, settings);
	
	if(process.detectedCount > 0) {
		let saveFile;

		if(settings.includes('Save to Original File')) {
			saveFile = fileLocation;
		} else {
			const { result } = await prompt({
				type: 'input',
				name: 'result',
				message: `All accounts have been successfully processed, and ${process.detectedCount} duplicates were detected (${process.deletedCount} deleted)! Please enter a file location for the updated vault: `
			});

			saveFile = result.trim() || './export.json';
		}
		
		fs.writeFileSync(saveFile, JSON.stringify(vault, null, 2));
		console.log(chalk.green('Your updated vault export has been saved at ' + saveFile + '.'));
	} else {
		console.log(chalk.yellow(`A total of ${vault.items.length} accounts were processed, with no duplicates found.`));
	}
};

(async () => {
	consoleHeader();
	await getFile();

	console.log('---------------------------------------------------------------------');
	console.log(`\n${chalk.bold('Basic Settings')} | Checks login entries with matching subdomains (default).\n${chalk.bold('Advanced Settings')} | Configure advanced settings for the vault checker.\n`);

	const command = await prompt({
		type: 'select',
		name: 'type',
		message: 'Please select an option below to start the vault checker.',
		choices: ['Basic Settings', 'Advanced Settings'],
	});
	
	consoleHeader();
	switch(command.type) {
		case 'Basic Settings':
			return main(false);
		case 'Advanced Settings':
			return main(true);
	}
})();