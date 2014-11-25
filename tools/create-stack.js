/**
 * Creates a new Auto Scaling group using Cloud Formation and the aws template
 * in the parent directory.
 *
 *     node create-stack.js --name NewCluster --keypair whatever
 *
 * Where `NewCluster` is a name for the stack.
 */

var exec = require('child_process').exec
var flags = require('flags')
var fs = require('fs')
var https = require('https')
var kew = require('kew')
var readline = require('readline')
var util = require('util')
var path = require('path')

flags.defineInteger('size', 5, 'How many instances to launch in the cluster.')
flags.defineString('name', '', 'Identifying name for the stack')
flags.defineString('keypair', '', 'The name of an EC2 Key Pair to allow SSH access to the instance.')
flags.defineString('type', 'm1.small', 'EC2 PV instance type (m1.small, m3.medium,. etc.)')

flags.parse()

var CMD_PREFIX = 'aws --profile home '

// Use public etcd discovery service.
var DISCOVERY_URL = 'https://discovery.etcd.io/new'

// Use local docker config.
var DOCKER_CFG = path.join(process.env['HOME'], '.dockercfg')

// Use the launch config in this repo.
var LAUNCH_CONFIG = path.resolve(__dirname, '../aws-launchconfig-coreos.template')

// Name for the cluster.
var name = flags.get('name') || exit('ERROR: Missing flag --name')

// Default params.
var params = [
  {Key: 'ClusterSize', Value: String(flags.get('size'))},
  {Key: 'KeyPair', Value: flags.get('keypair') || exit('ERROR: Missing flag --keypair')},
  {Key: 'InstanceType', Value: flags.get('type')}
]

fetchDiscoveryUrl()
.then(readDockerConfig)
.then(confirmParams)
.fail(function (e) {
  exit('FAILED: ' + e.message)
})


// Fetch an etcd discovery url and sets the "DiscoveryURL" param.
function fetchDiscoveryUrl() {
  var defer = kew.defer()
  https.get(DISCOVERY_URL, function (res) {
    var body = ''
    res.on('data', function (chunk) {
      body += chunk
    })
    res.on('end', function () {
      params.push({
        Key: 'DiscoveryURL',
        Value: body
      })
      defer.resolve(true)
    })

  }).on('error', function (err) {
    console.error('Failed to fetch discovery url', err)
    defer.reject(e)
  })
  return defer.promise
}

// Uses the local docker config to set the "DockerCfgEmail" and "DockerCfgToken" params.
function readDockerConfig() {
  var defer = kew.defer()
  fs.readFile(DOCKER_CFG, function (err, data) {
    if (err) {
      console.error('Unable to read docker config from', DOCKER_CFG, err)
      defer.reject(err)
      return
    }
    var cfg
    try {
      cfg = JSON.parse(data)
    } catch (err) {
      console.error('Failed to parse docker config:', DOCKER_CFG, data, err)
      defer.reject(err)
      return
    }
    cfg = cfg['https://index.docker.io/v1/']
    if (!cfg || !cfg.email || !cfg.auth) {
      console.error('Invalid docker config', data)
      defer.reject(new Error('Invalid docker config: ' + DOCKER_CFG))
      return
    }
    params.push({
      Key: 'DockerCfgEmail',
      Value: cfg.email
    })
    params.push({
      Key: 'DockerCfgToken',
      Value: cfg.auth
    })
    defer.resolve(true)
  })

  return defer.promise
}

function confirmParams() {
  var defer = kew.defer()
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  console.log('New stack configuration:')
  console.log(params.map(function (param) {
    return '  ' + pad(param.Key, 20) + param.Value
  }).join('\n'))
  rl.question('Create a new stack with these params? ', function (answer) {
    rl.close()
    if (answer != 'yes' && answer != 'y') return defer.reject(new Error('Aborted by user'))

    var args = {
      'stack-name': name,
      'template-body': 'file://' + LAUNCH_CONFIG,
      'parameters': params.map(function (param) {
        return 'ParameterKey=' + param.Key + ',ParameterValue=' + param.Value
      }).join(' ')
    }

    var cmd = CMD_PREFIX + 'cloudformation create-stack '
    for (var arg in args) {
      cmd += '--' + arg + ' ' + args[arg] + ' '
    }

    exec(cmd, function (err, stdout, stderr) {
      if (err) {
        console.log(stderr)
        defer.reject(new Error('Error creating stack:', err.message))
        return
      }
      console.log(stdout)
      defer.resolve(true)
    })
  })

  return defer.promise
}

function pad(str, len) {
  return str + new Array(len - str.length + 1).join(' ')
}

function exit(message) {
  console.error(message)
  process.exit(1)
}

