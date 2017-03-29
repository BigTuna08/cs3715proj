<?PHP
include('php/dbconnect.php');
$conn=getConnect();
session_start();
$playername='';
if(isset($_SESSION['playername'])){
	cout("recognised layer");
	$playername=$_SESSION['playername'];
}

function setNotifyBits($lobby){
	global $conn;
	$query="UPDATE $lobby SET changed=TRUE";
	$conn->query($query) or cout($conn->error);
}

function cout($s){
	$file = fopen('stdout.txt','a');
	fwrite($file,$s."\r\n");
	fclose($file);
}


$action='';
if(isset($_POST['action']))$action=$_POST['action'];
if(isset($_GET['action']))$action=$_GET['action'];
$page="none";
$page_data=[];
//if(isset($_GET['playername']))$playername=$_GET['playername'];
//if(isset($_POST['playername']))$playername=$_POST['playername'];
cout("name:'$playername'");
if($action===''){
	if($playername!=''){//try to put the player where they belong
		cout("player is lost, putting them where they belong");
		$stmt=$conn->prepare("SELECT activity FROM player WHERE name=?");
		$name=$playername;
		$stmt->bind_param("s",$name);
		$stmt->execute();
		$activity=explode(' ',$stmt->get_result()->fetch_array()['activity']);
		switch($activity[0]){
			case 'wait':
				$id=$activity[1];
				$query="SELECT * FROM lobby WHERE id=$id";
				if(count($conn->query($query)->fetch_all(MYSQLI_ASSOC))==0){
					//lobby has been deleted while you were away
					$query="UPDATE player SET activity='' WHERE name='$name'";
					$conn->query($query)or cout($conn->error);
					$page='browser';
				}else{			
					$page='lobby';
				}					
			break;
			case 'game':
				$page='game';
				$page_data['lobby_id']=$activity[1];
			break;
			default:
				$page='browser';
			break;
		}
	}else{
		cout("new player");
		$page='login';
	}
}else{
	cout("action: ".$action);
	switch($action){
		case 'logout':
			session_destroy();
			$page='login';
		break;
		case 'newuser':
			$page='newuser';
		break;
		case 'existinguser':
			$page='login';
		break;
		case 'signup':
			$name=$_POST['name'];
			$pass=$_POST['pass'];
			$stmt=$conn->prepare("SELECT id FROM player WHERE name=?");
			$stmt->bind_param("s",$name);
			$stmt->execute();
			$result=$stmt->get_result()->fetch_all(MYSQLI_ASSOC);
			if(count($result)==0){//name not taken, register and reload with name in url
				$hashpass=md5($pass."salty salt salt");
				$stmt=$conn->prepare("INSERT INTO player (name,pass) VALUES (?,?)");
				$stmt->bind_param("ss",$name,$hashpass);
				$stmt->execute() or cout($conn->error);
				$_SESSION['playername']=$name;
				$page='browser';
				//header("Location: index.php");//now that user is logg
				
			}else{
				$page='newuser';
				$page_data['notification']='that name is taken';
			}
		break;
		case 'login':
			$name=$_POST['name'];
			$pass=$_POST['pass'];
			$stmt=$conn->prepare("SELECT * FROM player WHERE name=?");
			$stmt->bind_param("s",$name);
			$stmt->execute();
			$result=$stmt->get_result()->fetch_all(MYSQLI_ASSOC);
			if(count($result)==0){
				cout("bad login");
				$page='login';
				$page_data['notification']='no player by that name';
			}else{
				$hash=md5($pass."salty salt salt");
				if($hash==$result[0]['pass']){
					cout("logging in");
					$_SESSION['playername']=$name;
					header("Location: index.php");
					return;
				}else{
					$page='login';
					$page_data['notification']='bad password';
				}
			}
		break;
		case 'newlobby':
			$proposed_name=$conn->real_escape_string($_POST['name']);
			//check if lobby exists
			$query="SELECT * FROM lobby WHERE name='".$proposed_name."'";
			if(count($conn->query($query)->fetch_all(MYSQLI_ASSOC))==0){
				//lobby does not exist
				
				$params=['seed'=>rand(),'dim'=>[4,4],'maptype'=>'random'];
				$params=json_encode($params);
				$params=$conn->real_escape_string($params);
				
				//register lobby
				$query="INSERT INTO `lobby` (name,param,turn) VALUES ('$proposed_name','$params',0)";
				$conn->query($query) or cout($conn->error);
				
				
				
				
				//get unique id
				$query="SELECT id FROM `lobby` WHERE name='$proposed_name'";
				$result=$conn->query($query) or cout($conn->error);
				$id=$result->fetch_array()['id'];
				
				$table_name='lobby_'.$id;
				
				//create lobby table
				$query="CREATE TABLE $table_name (playername VARCHAR(50),ready BOOLEAN,changed BOOLEAN,moveset TEXT,turn INT,actualturn INT,state INT)";
				$conn->query($query) or cout($conn->error);

				
				//remember that player is currently hosting (that way if they refresh nothing breaks)
				$query="UPDATE player SET activity='wait $id' WHERE name='$playername'";
				$conn->query($query) or cout($conn->error);
				
				//insert player into lobby
				$query="INSERT INTO $table_name (playername,ready,changed,turn,actualturn,state)VALUES('$playername',FALSE,TRUE,0,0,0)";
				$conn->query($query) or cout($conn->error);
		
				$page='lobby';
				
			}else{
				//lobby exists
				$page='browser';
				$page_data['notification']='that lobby already exists, perhaps you want to join it instead?';
				
				
				
				
			}
		break;
		case 'join':
		
			$page='lobby';
			$table_name='lobby_'.$_POST['lobby'];
			$id=$_POST['lobby'];
			$query="SELECT * FROM lobby WHERE id=$id";
			$result=$conn->query($query)->fetch_all(MYSQLI_ASSOC);
	
			if(count($result)==0 || $result[0]['ingame']){
				$page_data['notification']='that lobby is unavailable';
				$page='browser';
				break;
			}
			
			
			//remember that player is currently waiting
			$stmt=$conn->prepare("UPDATE player SET activity=? WHERE name=?");
			$name=$playername;
			$activity='wait '.$_POST['lobby'];
			$stmt->bind_param("ss",$activity,$name);
			$stmt->execute();
		
			
			//insert player into lobby
			$query="INSERT INTO $table_name (playername,ready,changed,turn,actualturn,state) VALUES ('$playername',FALSE,TRUE,0,0,0)";
			$conn->query($query) or cout($conn->error);
			
			//set changed bit
			$query="UPDATE $table_name SET changed=TRUE";
			$conn->query($query) or cout($conn->error);
			
		break;
		case 'leavelobby':
			//remove activity
			$query="UPDATE player SET activity='' WHERE name='$playername'";
			cout($query);
			$conn->query($query) or cout($conn->error);
			
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			
			//remove from lobby
			$query="DELETE FROM $table_name WHERE playername='$playername'";
			$conn->query($query) or cout($conn->error);
			
			//notify others
			setNotifyBits($table_name);
			
			//if lobby empty, delete it
			$query="SELECT * FROM $table_name";
			cout($query);
			
			
			if(count($conn->query($query)->fetch_all(MYSQLI_ASSOC))==0){
				cout("hello");
				$query1="DROP TABLE $table_name";
				$query2="DELETE FROM lobby WHERE id=$id";
				
				$conn->query($query1) or cout($conn->error);
				$conn->query($query2) or cout($conn->error);
			}
			return;
		break;	
		case 'ready':
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$query="UPDATE $table_name SET ready=TRUE WHERE playername='$playername'";
			$conn->query($query) or cout($conn->error);
			
			$query="SELECT * FROM $table_name WHERE ready=FALSE";
			$result=$conn->query($query)->fetch_all(MYSQLI_ASSOC);
			if(sizeof($result)==0){
				//everyone is ready so start turn timer
				$timestamp=date_timestamp_get(date_create());
				$query="UPDATE lobby SET turntimerstart=$timestamp WHERE id=$id";
				$conn->query($query) or cout($conn->error);
			}

			//notify others
			setNotifyBits($table_name);
			return;
		break;
		case 'updateparams':
			//update params
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$query="UPDATE lobby SET param='".$conn->real_escape_string($_POST['params'])."' WHERE id=$id";
			$conn->query($query) or cout($conn->error);
			setNotifyBits($table_name);
			return;
		break;
		case 'querylobby':
			

			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			//check if anything has been changed
			$query="SELECT changed FROM $table_name  WHERE playername='$playername'";
			$changed=$conn->query($query)->fetch_array()['changed'];
			
			//mark that updates were recieved
			$query="UPDATE $table_name SET changed=FALSE WHERE playername='$playername'";
			$conn->query($query) or cout($conn->error);

			if(isset($_POST['force']))$changed=1;//force update
			if($changed==0){
				echo "nochange";
				return;
			}else{
				$query="SELECT * FROM lobby WHERE id=$id";
				$result1=$conn->query($query)->fetch_array(MYSQLI_ASSOC)or cout($conn->error);

				$query="SELECT * FROM $table_name";
				$result2=$conn->query($query)->fetch_all(MYSQLI_ASSOC)or cout($conn->error);
				
				$ret=json_encode(['lobby'=>$result1,'players'=>$result2]);
				echo $ret;
			}
			return;
		break;
		case 'notifyentergame':
			//set player activity to game1
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			
			$query="UPDATE player SET activity='game $id' WHERE name='$playername'";
			$conn->query($query) or cout($conn->error);
			
			$query="UPDATE lobby SET ingame=TRUE where id=$id";
			$conn->query($query) or cout($conn->error);

			
			return;
		break;
		case 'loadgamedata':
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$query="SELECT * FROM lobby WHERE id=$id";
			$result1=$conn->query($query) or cout($conn->error);
			$result1=$result1->fetch_array(MYSQLI_ASSOC);
			$query="SELECT * FROM $table_name";
			$result2=$conn->query($query) or cout($conn->error);
			$result2=$result2->fetch_all(MYSQLI_ASSOC);
			$data=['lobby'=>$result1,'players'=>$result2];
			echo json_encode($data);;
			return;
		break;
		case 'notifyendturn':
			$moveset=$_POST['moveset'];
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$turn=$_POST['turn'];
			$prevturn=$turn-1;
			cout("want to submit moves for turn ".$turn);
			$query="SELECT actualturn FROM $table_name WHERE actualturn!=$prevturn";
			$error=false;
			$result=$conn->query($query) or $error=true;
			if($error){
				echo "error";
				return;
			}	
			$laggers=count($result->fetch_all(MYSQLI_ASSOC));
			
			$good=true;
			if($laggers>0){
				cout("some players need the old turn data");
				$good=false;
			}
			
			if($good){
				$query="UPDATE $table_name SET moveset='".
				$conn->real_escape_string($moveset)."' ,
				turn=$turn
				WHERE playername='$playername'";
				echo "good";
				
				cout("good");
				$conn->query($query) or cout($conn->error);
				return;
			}else{
				cout("told to wait");
				echo 'wait';
				return;
			}
		break;
		case 'pollendturn':
			
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$sendmoves=false;
			$turn=$_POST['turn'];
			
			cout("trying to advance to turn ".$turn);
			$query="SELECT * FROM $table_name WHERE turn!=$turn AND state=0";
			
			
			
			$result=$conn->query($query);
			if(!$result){
				cout("the game is gone");
				echo "error";
				return;
			}
			$result=$result->fetch_all(MYSQLI_ASSOC);
			if(sizeof($result)==0){
				//everyone is on the same page
				$sendmoves=true;
			}
			//cout("sendmoves: ".$sendmoves);
			//todo send timestamp
			if(!$sendmoves){
				cout("told to wait");
				echo "wait";
				return;
			}else{
				$query="SELECT * FROM $table_name WHERE turn=$turn";
				//cout($query);
				$result=$conn->query($query)->fetch_all(MYSQLI_ASSOC);
				
				$ret=['players'=>$result,'lobby'=>[]];
				cout(json_encode($ret));
				echo json_encode($ret);
			}
				
			return;
		break;
		case 'uploadmap':
			$mapdata=$_POST['mapdata'];
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$turn=$_POST['turn'];
			
			/*
			$query="SELECT turn FROM $table_name WHERE playername='$playername'";
			$turn=$conn->query($query)->fetch_all(MYSQLI_ASSOC)[0]['turn'];
			*/
			
			$query="UPDATE lobby SET turn=$turn, map='".$conn->real_escape_string($mapdata)."' WHERE id=$id";
			$conn->query($query) or cout($conn->error);
			
			
			$query="UPDATE $table_name SET actualturn=$turn WHERE playername='$playername'";
			$conn->query($query) or cout($conn->error);
			cout("uploaded");
		break;
		case 'notifyquit':
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$query="UPDATE  $table_name SET state=1 WHERE playername='$playername'";
			cout($query);
			$conn->query($query) or cout($conn->error);

			$query="UPDATE player SET activity='' WHERE name='$playername'";
			cout($query);
			$conn->query($query) or cout($conn->error);
			
			$query="SELECT * FROM $table_name WHERE state=0";
			cout($query);
			$result=$conn->query($query);
			
			if(count($rows=$result->fetch_all(MYSQLI_ASSOC))==1){
				cout("deleting game");
				$lastplayer=$rows[0]['playername'];
				$query="UPDATE player SET activity='' WHERE name='$lastplayer'";
				cout($query);
				$conn->query($query);
				cout($query);
				
				$query="DROP TABLE $table_name";
				cout($query);
				$conn->query($query);
				
				$query="DELETE FROM lobby WHERE id=$id";
				cout($query);
				$conn->query($query);

			}
		break;
		default:
			$page='login';
			$page_data['notification']='congratulations, you found a bug';
		break;
		
	}
}

if($page!="none"){
	echo '<!doctype html><html><head><title>Hex Game</title>
		<link rel="stylesheet" type="text/css" href="css/style.css">
		<meta content="text/html;charset=utf-8" http-equiv="Content-Type">
		</head><body onload="window.init && init()">';
	switch($page){
		case 'newuser':
			include('page/newuser.php');
		break;
		case 'login':
			include('page/login.php');
		break;
		case 'browser':
			include('page/browser.php');
		break;
		case 'lobby':
			include('page/lobby.php');
		break;
		case 'game':
			include('page/game.php');
		break;
		case 'default':
			?>How did you get here?<?PHP
		break;
		
	}
	echo '</body></html>';
}



?>