'use strict';

exports = module.exports = sudo;

const spawn = require('child_process').spawn;
const read = require('read');
const inpathSync = require('inpath').sync;
const pidof = require('pidof');
const path = process.env['PATH'].split(':');
const sudoBin = inpathSync('sudo', path);

let cachedPassword;

/**
 * Run command as root
 * @param {Array.<string>} command Array of command words
 * @param {object} options command options
 * @return {object} Return child_process's spawn result
 */
function sudo(command, options) {
    let prompt = '#node-sudo-passwd#';
    let prompts = 0;

    let args = ['-S', '-p', prompt];
    args.push(...command);

    // The binary is the first non-dashed parameter to sudo
    let bin = command.filter(function(i) {
        return i.indexOf('-') !== 0;
    })[0];

    options = options || {};
    let spawnOptions = options.spawnOptions || {};
    spawnOptions.stdio = 'pipe';

    let child = spawn(sudoBin, args, spawnOptions);

    // Wait for the sudo:d binary to start up
    const waitForStartup = (err, pid) => {
        if (err) {
            throw new Error('Couldn\'t start ' + bin);
        }

        if (pid || child.exitCode !== null) {
            child.emit('started');
        } else {
            setTimeout(function() {
                pidof(bin, waitForStartup);
            }, 100);
        }
    };
    pidof(bin, waitForStartup);

    // FIXME: Remove this handler when the child has successfully started
    child.stderr.on('data', function(data) {
        let lines = data.toString().trim().split('\n');
        lines.forEach(function(line) {
            if (line === prompt) {
                if (++prompts > 1) {
                    // The previous entry must have been incorrect, since sudo asks again.
                    cachedPassword = null;
                }

                if (options.password) {
                    child.stdin.write(options.password + '\n');
                } else if (options.cachePassword && cachedPassword) {
                    child.stdin.write(cachedPassword + '\n');
                } else {
                    const args = {
                        prompt: options.prompt ||
                            'sudo requires your password: ',
                        silent: true,
                    };
                    read(args, function(error, answer) {
                        child.stdin.write(answer + '\n');
                        if (options.cachePassword) {
                            cachedPassword = answer;
                        }
                    });
                }
            }
        });
    });

    return child;
}
