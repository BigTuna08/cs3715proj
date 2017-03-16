<?php
include('dbconnect.php');
$conn=getConnect();

$id=$_POST['lobby'];
$player=$_POST['player'];
if(isset($_POST['ready'])){
	//make player ready
	$query="UPDATE lobby_$id SET ready=TRUE WHERE player=$player";
	$conn->query($query);
	
	//notify others
	$query="UPDATE lobby_$id SET changed=TRUE";
	$conn->query($query);
	return;

}


//check if anything has been changed
$query="SELECT changed FROM lobby_$id WHERE player=$player";
$changed=$conn->query($query)->fetch_array()['changed'];

//mark that updates were recieved
$query="UPDATE lobby_$id SET changed=FALSE WHERE player=$player";
$conn->query($query) or die($conn->error);

if($changed==0){
	echo "nochange";
	return;
}else{
	$query="SELECT * FROM lobby WHERE id=$id";
	$result1=$conn->query($query)->fetch_array(MYSQLI_ASSOC)or die($conn->error);

	$query="SELECT * FROM lobby_$id";
	$result2=$conn->query($query)->fetch_all(MYSQLI_ASSOC)or die($conn->error);
	
	$ret=json_encode(['lobby'=>$result1,'players'=>$result2]);
	echo $ret;
}
	
	

	