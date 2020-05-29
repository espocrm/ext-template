const fs = require('fs-extra');

var exec = require('child_process').exec;

var path = require('path');

var isObject = function (item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
};

var mergeDeep = function (target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
        if (isObject(source[key])) {
            if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
};

exports.loadConfig = function () {
    const configDefault = require('./config-default.json');
    var config = {};

    if (fs.existsSync('./config.json')) {
        config = {};
        mergeDeep(config, configDefault, require('./config.json'));
    } else {
        config = configDefault;
    }

    return config;
}

var execute = function (command, callback) {
    exec(command, function(error, stdout, stderr) {
        callback(stdout);
    });
};

exports.execute = execute;

var deleteDirRecursively = function (path) {
    if (fs.existsSync(path) && fs.lstatSync(path).isDirectory()) {
        fs.readdirSync(path).forEach(function(file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteDirRecursively(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    } else if (fs.existsSync(path) && fs.lstatSync(path).isFile()) {
        fs.unlinkSync(path);
    }
};

exports.deleteDirRecursively = deleteDirRecursively;


var promiseAllWait = function (promises) {
    var all_promises = [];
    for(var i_promise=0; i_promise < promises.length; i_promise++) {
        all_promises.push(
            promises[i_promise]
            .then(function(res) {
                return { res: res };
            }).catch(function(err) {
                return { err: err };
            })
        );
    }

    return Promise.all(all_promises)
    .then(function(results) {
        return new Promise(function(resolve, reject) {
            var is_failure = false;
            var i_result;
            for(i_result=0; i_result < results.length; i_result++) {
                if (results[i_result].err) {
                    is_failure = true;
                    break;
                } else {
                    results[i_result] = results[i_result].res;
                }
            }

            if (is_failure) {
                reject( results[i_result].err );
            } else {
                resolve(results);
            }
        });
    });
};

var movePromiser = function(from, to, records) {
    return fs.move(from, to)
    .then(function() {
        records.push( {from: from, to: to} );
    });
};

exports.moveDir = function(from_dir, to_dir) {
    return fs.readdir(from_dir)
    .then(function(children) {
        return fs.ensureDir(to_dir)
        .then(function() {
            var move_promises = [];
            var moved_records = [];
            var child;
            for(var i_child=0; i_child < children.length; i_child++) {
                child = children[i_child];
                move_promises.push(movePromiser(
                    path.join(from_dir, child),
                    path.join(to_dir, child),
                    moved_records
                ));
            }

            return promiseAllWait(move_promises)
            .catch(function(err) {
                var undo_move_promises = [];
                for(var i_moved_record=0; i_moved_record < moved_records.length; i_moved_record++) {
                    undo_move_promises.push( fs.move(moved_records[i_moved_record].to, moved_records[i_moved_record].from) );
                }

                return promiseAllWait(undo_move_promises)
                .then(function() {
                    throw err;
                });
            });
        }).then(function() {
            return fs.rmdir(from_dir);
        });
    });
};

exports.getProcessParam = function (name) {
    var value = null;
    process.argv.forEach(function (item) {
        if (item.indexOf('--'+name+'=') === 0) {
            value = item.split('=')[1];
        }
    });
    return value;
}

exports.camelCaseToHyphen = (string => string.replace( /([a-z])([A-Z])/g, '$1-$2' ).toLowerCase());

exports.hasProcessParam = function (param) {
    for (var i in process.argv) {
        if (process.argv[i] === '--' + param) return true;
    }
    return false;
}
