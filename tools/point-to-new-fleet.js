/**
 * Updates the ALIAS records for the root domain and wildcard subdomain for all
 * hosted zones to point at an ELB.
 *
 *     node point-to-new-fleet.js NewCluster
 *
 * Where `NewCluster` is a substring used to identify the correct ELB.
 */

var exec = require('child_process').exec
var readline = require('readline')
var util = require('util')

var flagTargetELB = String(process.argv[2]).toLowerCase()

// Domain prefixes to map to the ELB.
var PREFIXES = ['', '*.']

var CMD_PREFIX = 'aws --profile home '

exec(CMD_PREFIX + 'elb describe-load-balancers', function (err, stdout, stderr) {
  if (err) return console.error('Error fetching load balancer details:', err);
  var elbs = JSON.parse(stdout).LoadBalancerDescriptions
  var targetELB = null

  elbs.forEach(function (elb) {
    if (elb.CanonicalHostedZoneName.toLowerCase().indexOf(flagTargetELB) != -1) targetELB = elb
  })

  if (!targetELB) {
    console.error('No ELBs match desired name: "' + flagTargetELB + '"')
    console.log('Available ELBs:')
    elbs.forEach(function (elb) {
      console.log('  ', elb.CanonicalHostedZoneName)
    })
    return
  }

  console.log('Found Matching ELB:')
  console.log('  ', targetELB.CanonicalHostedZoneName)

  exec(CMD_PREFIX + 'route53 list-hosted-zones', function (err, stdout, stderr) {
    if (err) return console.error('Error fetching hosted zones:', err)
    var zones = JSON.parse(stdout).HostedZones
    console.log('Fetching zone details')
    zones.forEach(function (zone) {
      console.log('  ', zone.Name)
    })

    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question('Update ALIAS records with target ELB? ', function (answer) {
      rl.close()
      if (answer != 'yes' && answer != 'y') return console.log('Aborting...')
      util.print('Proceeding to update resource record sets...')

      var commands = []
      zones.forEach(function (zone) {
        // Set root name and wildcard.
        PREFIXES.forEach(function (prefix) {
          var command = CMD_PREFIX + 'route53 change-resource-record-sets ' +
              '--hosted-zone-id ' + zone.Id + ' --change-batch \'' + JSON.stringify({
                'Comment': 'Updating ELB target',
                'Changes': [
                  {
                    'Action': 'UPSERT',
                    'ResourceRecordSet': {
                      'Name': prefix + zone.Name,
                      'Type': 'A',
                      'AliasTarget': {
                        'HostedZoneId': targetELB.CanonicalHostedZoneNameID,
                        'DNSName': targetELB.CanonicalHostedZoneName,
                        'EvaluateTargetHealth': false
                      }
                    }
                  }
                ]
              }) + '\''

          commands.push(command)
        })
      })

      function next() {
        var cmd = commands.shift()
        if (!cmd) return console.log(' Done')
        util.print('.')
        exec(cmd, function (err, stdout, stderr) {
          if (err) return console.error('Error executing command:', cmd, err);
          next()
        })
      }

      next()

    })
  })
})
