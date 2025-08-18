<h1 align="center">Bitwarden Duplicate Checker | Remove vault duplicates easily.</h1>

<p align="center">A CLI utility designed to scan for duplicate password entries in your Bitwarden vault export.<br><br> <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg"></a></p>

## Features
- (🔍) Scan your Bitwarden vault export for duplicate login entries
- (🌍) Detect duplicates by subdomain or apex domains for deeper scans (advanced mode)
- (⚡) Choose between automatic deletion or manual review of duplicates
- (🛠️) Configure advanced settings: root domain comparison, save to original file, show passwords
- (📁) Export results as JSON for easy import to your Bitwarden vault.

## Setup
To use Bitwarden Duplicate Checker, make sure Node.js is properly installed on your computer (run `node --version` to check if it exists). If you don't have it installed yet, you can download it [here](https://nodejs.org/en/download).

Then, clone the repository and install the dependencies:

```bash
$ git clone https://github.com/BrianWalczak/Bitwarden-Duplicate-Checker.git; # Clone the repository from GitHub
$ cd Bitwarden-Duplicate-Checker # Enter the extracted repository folder
$ npm install # Install libraries and dependencies
```

To run the CLI, simply use the following command and follow the prompts:
```text
$ node index.js
? Please enter the path to your vault export file (unencrypted): ▍
```

## Results
After configuring the program, Bitwarden Duplicate Checker will scan for all account entries in your vault and search for potential duplicates.

### Example Output
```text
Checking 690 accounts with 544 unique websites...

[DETECTED] 3 duplicate(s) found for aa.com with username EXAMPLE and password *******...
√ Would you like to delete all duplicates for this website (y/n)? y
Duplicates for this login have been successfully deleted.

√ All accounts have been successfully processed, and 3 duplicates were detected (3 deleted)! Please enter a file location for the updated vault: new.json
Your updated vault export has been saved at ./new.json.
```

## Contributions
If you'd like to contribute to this project, please create a pull request [here](https://github.com/BrianWalczak/Bitwarden-Duplicate-Checker/pulls). You can submit your feedback or any bugs that you find, on our <a href='https://github.com/BrianWalczak/Bitwarden-Duplicate-Checker/issues'>issues page</a>. Contributions are highly appreciated and will help us keep this project up-to-date!

If you'd like to support this project and its development, you can send me a donation <a href='https://ko-fi.com/brianwalczak'>here</a> :)

<br>
  <p align="center">Made with ♡ by <a href="https://www.brianwalczak.com">Briann</a></p>
