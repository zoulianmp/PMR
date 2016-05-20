<?php

include('/usr/lib/cgi-bin/dev/robert/includes/config.php');

$link = mssql_connect(ARIA_DB, ARIA_USERNAME, ARIA_PASSWORD);

    //echo "Got a link<br>";

if (!$link) {
  die('Something went wrong while connecting to MSSQL');
}

$sql = "
USE variansystem;
SELECT DISTINCT
pt.PatientId,
pt.LastName,
pt.FirstName,
--pt.PatientSer,
--ac.ActivityCode,
nsa.NonScheduledActivityCode,
--nsa.ObjectStatus,
nsa.CreationDate,
doc.FirstName,
doc.LastName

FROM
Patient pt

INNER JOIN PatientDoctor pd ON pt.PatientSer = pd.PatientSer
INNER JOIN NonScheduledActivity nsa ON pt.PatientSer = nsa.PatientSer
INNER JOIN ActivityInstance aci ON nsa.ActivityInstanceSer = aci.ActivityInstanceSer
INNER JOIN Activity ac ON aci.ActivitySer = ac.ActivitySer
INNER JOIN Doctor doc ON doc.ResourceSer = pd.ResourceSer

WHERE
nsa.CreationDate >= DATEADD(day,-14,CONVERT(date,GETDATE()))
AND
nsa.NonScheduledActivityCode LIKE '%Open%'
AND
ac.ActivityCode LIKE '%PMR%'
AND
pd.PrimaryFlag = '1'
AND
pd.OncologistFlag = '1'

ORDER BY doc.FirstName ASC, nsa.CreationDate DESC";

$query = mssql_query($sql); //or die('Query Failed.');
//echo $query;
$arr = array();

if(!mssql_num_rows($query)) {
  echo 'No records found.';
}else{

  while($row = mssql_fetch_array($query)){
    $rowArr = array(
      'PatientID'     => $row[0],
      'LastName'      => $row[1],
      'FirstName'     => $row[2],
      'NSAC'          => $row[3],
      'CreationDate'  => $row[4],
      'DocFirstName'  => $row[5],
      'DocLastName'   => $row[6]
    );
    array_push($arr,$rowArr);
  }

}
  # JSON-encode the response
  //header('Content-Type: application/json');
echo json_encode(array('list'=>$arr));



mssql_free_result($result);
?>
