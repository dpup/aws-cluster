ip=`curl "http://601fourth.com/ip.php"`
echo "Restarting services via $ip"
fleetctl --tunnel $ip destroy defaultweb*
fleetctl --tunnel $ip start defaultweb*
fleetctl --tunnel $ip list-units
