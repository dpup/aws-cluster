# aws-cluster

This repo contains configuration files to set up a
[CoreOS cluster on EC2](https://coreos.com/docs/running-coreos/cloud-providers/ec2/) with an ELB and
[Vulcan](http://www.vulcanproxy.com) reverse proxies. There is also a sample configuration for an
apache server.

To set up a new cluster:

1. [Create a new stack](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#cstack=sn%7EMyCoreOSCluster)
2. Select the template
3. Follow the steps (use `docker login` to get an auth token for private docker repositories)
4. Make a note of one instance's public IP and export in `CLUSTER_IP`

To start the vulcan instances (assuming you have 5 hosts):

```
  fleetctl --tunnel $CLUSTER_IP start vulcan/vulcan.*.service
```

In Route53 create A records for your domains and point at the Load Balancer's public IP (it'll look
something like MyCluster-ClusterLB-42342ASFGASD-1457111472.us-east-1.elb.amazonaws.com)

Update [defaultweb/defaultweb-discovery.service](defaultweb/defaultweb-discovery.service) to include
the domains you manage.

Then you can start the default apache server using:

```
  fleetctl --tunnel $CLUSTER_IP start defaultweb/*.service
```

To customize the apache server you'll want to push to your own docker repository, and update the
service config accordingly.

(Note: [Vulcan](http://www.vulcanproxy.com) isn't yet intended for production use)
