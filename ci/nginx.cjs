#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('Setting up nginx configuration...');

const siteName = 'gameme.fun';
const sourceConfig = path.join(__dirname, '..', 'ci', 'conf.nginx');
const availablePath = `/etc/nginx/sites-available/${siteName}`;
const enabledPath = `/etc/nginx/sites-enabled/${siteName}`;

async function setupNginx() {
  const runCommand = (cmd, description) => {
    return new Promise((resolve, reject) => {
      console.log(`\n${description}...`);
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          reject(error);
          return;
        }
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        resolve();
      });
    });
  };

  try {
    // Copy nginx config
    await runCommand(
      `sudo cp ${sourceConfig} ${availablePath}`,
      'Copying nginx configuration'
    );

    // Create symlink
    await runCommand(
      `sudo ln -s ${availablePath} ${enabledPath}`,
      'Creating symlink to sites-enabled'
    );

    // Test nginx configuration
    await runCommand(
      'sudo nginx -t',
      'Testing nginx configuration'
    );

    // Restart nginx
    await runCommand(
      'sudo systemctl restart nginx',
      'Restarting nginx'
    );

    console.log('\n✅ Nginx configuration completed successfully!');
  } catch (error) {
    console.error('\n❌ Nginx setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupNginx();