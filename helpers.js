const fs = require('fs-extra');
const exec = require('child_process').exec;
const path = require('path');

const isObject = function (item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

const mergeDeep = function (target, ...sources) {
    if (!sources.length) {
        return target;
    }

    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) {
                    Object.assign(target, {[key]: {}});
                }

                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, {[key]: source[key]});
            }
        }
    }

    return mergeDeep(target, ...sources);
};

exports.loadConfig = () => {
    const configDefault = require('./config-default.json');
    let config;

    if (fs.existsSync('./config.json')) {
        config = {};
        mergeDeep(config, configDefault, require('./config.json'));
    } else {
        config = configDefault;
    }

    return config;
}

const execute = (command, callback) => {
    exec(command, (error, stdout, stderr) => {
        callback(stdout);
    });
};

exports.execute = execute;

const deleteDirRecursively = path => {
    if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
        fs.readdirSync(path).forEach(file => {
            const curPath = path + "/" + file;

            if (fs.lstatSync(curPath).isDirectory()) {
                deleteDirRecursively(curPath);

                return;
            }

            fs.unlinkSync(curPath);
        });

        fs.rmdirSync(path);

        return;
    }

    if (fs.existsSync(path) && fs.lstatSync(path).isFile()) {
        fs.unlinkSync(path);
    }
};

exports.deleteDirRecursively = deleteDirRecursively;

const promiseAllWait = promises => {
    let all_promises = [];

    for (let i_promise = 0; i_promise < promises.length; i_promise++) {
        all_promises.push(
            promises[i_promise]
                .then(res => ({res: res}))
                .catch(err => ({err: err}))
        );
    }

    return Promise.all(all_promises)
        .then(results => {
            return new Promise((resolve, reject) => {
                let is_failure = false;

                let i_result;

                for (i_result = 0; i_result < results.length; i_result++) {
                    if (results[i_result].err) {
                        is_failure = true;

                        break;
                    } else {
                        results[i_result] = results[i_result].res;
                    }
                }

                if (is_failure) {
                    reject(results[i_result].err);
                } else {
                    resolve(results);
                }
            });
        });
};

const movePromiser = (from, to, records) => {
    return fs.move(from, to)
        .then(() => {
            records.push({from: from, to: to});
        });
};

exports.moveDir = (from_dir, to_dir) => fs.readdir(from_dir)
    .then(children => fs.ensureDir(to_dir)
        .then(() => {
            let move_promises = [];
            let moved_records = [];
            let child;

            for (let i_child = 0; i_child < children.length; i_child++) {
                child = children[i_child];

                move_promises.push(movePromiser(
                    path.join(from_dir, child),
                    path.join(to_dir, child),
                    moved_records
                ));
            }

            return promiseAllWait(move_promises)
                .catch(err => {
                    let undo_move_promises = [];

                    for (let i_moved_record = 0; i_moved_record < moved_records.length; i_moved_record++) {
                        undo_move_promises
                            .push(fs.move(moved_records[i_moved_record].to, moved_records[i_moved_record].from));
                    }

                    return promiseAllWait(undo_move_promises)
                        .then(() => {
                            throw err;
                        });
                });
        })
        .then(() => fs.rmdir(from_dir)));

exports.getProcessParam = name => {
    let value = null;

    process.argv.forEach(item => {
        if (item.indexOf('--'+name+'=') === 0) {
            value = item.split('=')[1];
        }
    });

    return value;
}

exports.camelCaseToHyphen = (string => string.replace( /([a-z])([A-Z])/g, '$1-$2' ).toLowerCase());

exports.hasProcessParam = param => {
    for (let i in process.argv) {
        if (process.argv[i] === '--' + param) {
            return true;
        }
    }

    return false;
}
