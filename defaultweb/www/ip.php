<?
header('Content-type: text/plain');

$curl = curl_init('http://169.254.169.254/latest/meta-data/public-ipv4');
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 1);
$result = curl_exec($curl);

if ($result !== false) {
  echo $result;
} else {
  echo "Error: " . curl_error($curl);
}

?>
