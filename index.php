<?PHP
include('php/dbconnect.php');
$conn=getConnect();

function setNotifyBits($lobby){
	global $conn;
	$query="UPDATE $lobby SET changed=TRUE";
	$conn->query($query) or die($conn->error);
}

function cout($s){
	$file = 'stdout.txt';
	$current = file_get_contents($file);
	$current .= "$s\r\n";
	file_put_contents($file, $current);
}

$page="none";
$page_data=[];
$playername='';
if(isset($_GET['playername']))$playername=$_GET['playername'];
if(isset($_POST['playername']))$playername=$_POST['playername'];
cout("new connection from player:'$playername'");
if(!isset($_POST['action'])){
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
					$conn->query($query)or die($conn->error);
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
	cout("action: ".$_POST['action']);
	switch($_POST['action']){
		case 'signup':
			$name=$_POST['name'];
			$stmt=$conn->prepare("SELECT id FROM player WHERE name=?");
			$stmt->bind_param("s",$name);
			$stmt->execute();
			$result=$stmt->get_result()->fetch_all(MYSQLI_ASSOC);
			if(count($result)==0){//name not taken, register and reload with name in url
				$stmt=$conn->prepare("INSERT INTO player (name) VALUES (?)");
				$stmt->bind_param("s",$name);
				$stmt->execute() or die($conn->error);
				header("Location: index.php?playername=$name");
				return;
			}else{
				$page='login';
				$page_data['notification']='that name is taken';
			}
		break;
		case 'login':
			$name=$_POST['name'];
			$stmt=$conn->prepare("SELECT * FROM player WHERE name=?");
			$stmt->bind_param("s",$name);
			$stmt->execute();
			$result=$stmt->get_result()->fetch_all(MYSQLI_ASSOC);
			if(count($result)==0){
				cout("bad login");
				$page='login';
				$page_data['notification']='no player by that name';
			}else{
				cout("logging in");
				header("Location: index.php?playername=$name");
				return;
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
				$conn->query($query) or die($conn->error);
				
				
				
				
				//get unique id
				$query="SELECT id FROM `lobby` WHERE name='$proposed_name'";
				$result=$conn->query($query) or die($conn->error);
				$id=$result->fetch_array()['id'];
				
				$table_name='lobby_'.$id;
				
				//create lobby table
				$query="CREATE TABLE $table_name (playername VARCHAR(50),ready BOOLEAN,changed BOOLEAN,moveset TEXT,turn INT)";
				$conn->query($query) or die($conn->error);

				
				//remember that player is currently hosting (that way if they refresh nothing breaks)
				$query="UPDATE player SET activity='wait $id' WHERE name='$playername'";
				$conn->query($query) or die($conn->error);
				
				//insert player into lobby
				$query="INSERT INTO $table_name (playername,ready,changed,turn)VALUES('$playername',FALSE,TRUE,0)";
				$conn->query($query) or die($conn->error);
		
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
			if($conn->query($query)->fetch_all(MYSQLI_ASSOC)[0]['ingame']){
				$page_data['notification']='game already started, you just missed them';
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
			$query="INSERT INTO $table_name (playername,ready,changed,turn) VALUES ('$playername',FALSE,TRUE,0)";
			$conn->query($query) or die($conn->error);
			
			//set changed bit
			$query="UPDATE $table_name SET changed=TRUE";
			$conn->query($query) or die($conn->error);
			
		break;
		case 'leavelobby':
			//remove activity
			$query="UPDATE player SET activity='' WHERE name='$playername'";
			cout($query);
			$conn->query($query) or die($conn->error);
			
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			
			//remove from lobby
			$query="DELETE FROM $table_name WHERE playername='$playername'";
			$conn->query($query) or die($conn->error);
			
			//notify others
			setNotifyBits($table_name);
			
			//if lobby empty, delete it
			$query="SELECT * FROM $table_name";
			cout($query);
			
			
			if(count($conn->query($query)->fetch_all(MYSQLI_ASSOC))==0){
				cout("hello");
				$query1="DROP TABLE $table_name";
				$query2="DELETE FROM lobby WHERE id=$id";
				
				$conn->query($query1) or die($conn->error);
				$conn->query($query2) or die($conn->error);
			}
			return;
		break;	
		case 'ready':
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$query="UPDATE $table_name SET ready=TRUE WHERE playername='$playername'";
			$conn->query($query) or die($conn->error);
			
			$query="SELECT * FROM $table_name WHERE ready=FALSE";
			$result=$conn->query($query)->fetch_all(MYSQLI_ASSOC);
			if(sizeof($result)==0){
				//everyone is ready so start turn timer
				$timestamp=date_timestamp_get(date_create());
				$query="UPDATE lobby SET turntimerstart=$timestamp WHERE id=$id";
				$conn->query($query) or die($conn->error);
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
			$conn->query($query) or die($conn->error);
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
			$conn->query($query) or die($conn->error);

			if(isset($_POST['force']))$changed=1;//force update
			if($changed==0){
				echo "nochange";
				return;
			}else{
				$query="SELECT * FROM lobby WHERE id=$id";
				$result1=$conn->query($query)->fetch_array(MYSQLI_ASSOC)or die($conn->error);

				$query="SELECT * FROM $table_name";
				$result2=$conn->query($query)->fetch_all(MYSQLI_ASSOC)or die($conn->error);
				
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
			$conn->query($query) or die($conn->error);
			
			$query="UPDATE lobby SET ingame=TRUE where id=$id";
			$conn->query($query) or die($conn->error);

			
			return;
		break;
		case 'loadgamedata':
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$query="SELECT * FROM lobby WHERE id=$id";
			$result1=$conn->query($query) or die($conn->error);
			$result1=$result1->fetch_array(MYSQLI_ASSOC);
			$query="SELECT * FROM $table_name";
			$result2=$conn->query($query) or die($conn->error);
			$result2=$result2->fetch_all(MYSQLI_ASSOC);
			$data=['lobby'=>$result1,'players'=>$result2];
			echo json_encode($data);;
			return;
		break;
		case 'notifyendturn':
			$moveset=$_POST['moveset'];
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$query="UPDATE $table_name SET moveset='".
				$conn->real_escape_string($moveset)."' ,
				turn=turn+1 
				WHERE playername='$playername'";
			
			$conn->query($query) or die($conn->error);
			
			
			//TODO if all players notified, restart timer
			
		break;
		case 'pollendturn':
			
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$sendmoves=false;
			cout("hi");	
			//check what the next turn number is
			$query="SELECT * FROM $table_name WHERE playername='$playername'";
			cout($query);
			if(!($result=$conn->query($query))){
				echo "error";
				return;
			}
			$result=$conn->query($query)->fetch_all(MYSQLI_ASSOC)[0];
			$wantedturn=$result['turn'];
			
			cout($wantedturn);
			//check that everyone has the same turn number
			$query="SELECT * FROM $table_name WHERE turn!=$wantedturn";
			cout($query);	
			$result=$conn->query($query)->fetch_all(MYSQLI_ASSOC);
			if(sizeof($result)==0){
				//everyone is on the same page
				$sendmoves=true;
			}
			cout("sendmoves: ".$sendmoves);
			//todo send timestamp
			if(!$sendmoves){
				echo "wait";
				return;
			}else{
				$query="SELECT * FROM $table_name";
				//cout($query);	
				$result=$conn->query($query)->fetch_all(MYSQLI_ASSOC);
				
				$ret=['players'=>$result,'lobby'=>[]];
				cout(json_encode($ret));
				echo json_encode($ret);
			}
				
			//get current turn from lobby
			//check time, is time expired
			//if time not expired
				//server checks all player turn numbers are equal to next turn
				//if equal
					//$newturn = true
				//
			//if timer expired
				//force moves to zero and update turn numbers on all players
				//newturn=true
			//if newturn
				// don't update lobby turn number, do restart lobby timer
				//echo the move data
			//
				
		break;
		case 'uploadmap':
			$mapdata=$_POST['mapdata'];
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			
			$query="SELECT turn FROM $table_name WHERE playername='$playername'";
			$turn=$conn->query($query)->fetch_all(MYSQLI_ASSOC)[0]['turn'];
			
			
			$query="UPDATE lobby SET turn=$turn, map='".$conn->real_escape_string($mapdata)."' WHERE id=$id";
			$conn->query($query) or die($conn->error);
			
		break;
		case 'notifyquit':
			$id=$_POST['lobby_id'];
			$table_name='lobby_'.$id;
			$query="DELETE FROM $table_name WHERE playername='$playername'";
			cout($query);
			$conn->query($query) or die($conn->error);

			$query="UPDATE player SET activity='' WHERE name='$playername'";
			cout($query);
			$conn->query($query) or die($conn->error);
			
			$query="SELECT * FROM $table_name";
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
	echo '<!doctype html><html><head><title>Hex Game</title></head><body>';
	switch($page){
		case 'login':
			if(isset($page_data['notification']))echo $page_data['notification'];
			?>
			<form method="POST" action="index.php">
				<input type="hidden" name="action" value="login">
				<label>Login:<input name="name" type="text"></label>
			</form>
			<form method="POST" action="index.php">
				<input type="hidden" name="action" value="signup">
				<label>New Player:<input name="name" type="text"></label>
			</form>
			<?PHP
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

