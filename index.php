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
if(!isset($_POST['action'])){
	if($playername!=''){//try to put the player where they belong
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
		$page='login';
	}
}else{
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
				$page='login';
				$page_data['notification']='no player by that name';
			}else{
				header("Location: index.php?playername=$name");
				return;
			}
		case 'newlobby':
			
			$proposed_name=$_POST['name'];
			//check if lobby exists
			$query="SELECT * FROM lobby WHERE name='$proposed_name'";
			if(count($conn->query($query)->fetch_all(MYSQLI_ASSOC))==0){
				//lobby does not exist
				
				$params=['seed'=>123456,'dim'=>[4,4]];
				$params=json_encode($params);
				$params=$conn->real_escape_string($params);
				echo $params;
				//register lobby
				$query="INSERT INTO `lobby` (name,param) VALUES ('$proposed_name','$params')";
				$conn->query($query) or die($conn->error);
				
				
				
				
				//get unique id
				$query="SELECT id FROM `lobby` WHERE name='$proposed_name'";
				$result=$conn->query($query) or die($conn->error);
				$id=$result->fetch_array()['id'];
				echo 'got '.$id;
				
				$table_name='lobby_'.$id;
				
				//create lobby table
				$query="CREATE TABLE $table_name (playername VARCHAR(50),ready BOOLEAN,changed BOOLEAN,move TEXT,endturn BOOLEAN)";
				$conn->query($query) or die($conn->error);
				
				//remember that player is currently hosting (that way if they refresh nothing breaks)
				$stmt=$conn->prepare("UPDATE player SET activity='wait $id' WHERE name=?");
				$name=$playername;
				$stmt->bind_param("s",$name);
				$stmt->execute();
				
				//insert player into lobby
				$query="INSERT INTO $table_name (playername,ready,changed)VALUES('$playername',FALSE,TRUE)";
				echo $query;
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
			
			//remember that player is currently waiting
			$stmt=$conn->prepare("UPDATE player SET activity=? WHERE name=?");
			$name=$playername;
			$activity='wait '.$_POST['lobby'];
			$stmt->bind_param("ss",$activity,$name);
			$stmt->execute();
		
			
			//insert player into lobby
			$query="INSERT INTO $table_name (playername,ready,changed) VALUES ('$playername',FALSE,TRUE)";
			echo $query;
			$conn->query($query) or die($conn->error);
			
			//set changed bit
			$query="UPDATE $table_name SET changed=TRUE";
			echo $query;
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
			$stmt=$conn->prepare("SELECT * FROM lobby");
			$stmt->execute();
			$result=$stmt->get_result()->fetch_all(MYSQLI_ASSOC);
			?>
			
			<table border>
			<tr><td colspan=2>LOBBIES</td></tr>
			<tr><td>name</td><td></td></tr>
			<?PHP
			foreach($result as $lobby){
				?>
				<tr>
				
				<form method="post" action="index.php?playername=<?PHP echo $playername?>">
					<input type="hidden" name="action" value="join">
					<input type="hidden" name="lobby" value="<?PHP echo $lobby['id']?>">
					<td><div><?PHP print_r($lobby) ?></div></td>
					<td><input type="submit" value="JOIN"></td>
				</form>
				</tr>
				<?PHP
			}
			?>
			</table>
			<?PHP
			if(isset($page_data['notification']))echo $page_data['notification'];
			?>
			
			<form method="POST" action="index.php?playername=<?PHP echo $playername?>">
				<input type="hidden" name="action" value="newlobby">
				<input type="text" name="name" value="unique name">
				<input type="submit" value="New Lobby">
			</form>
			<?PHP
		break;
		case 'lobby':
			include('page/lobby.php');
		break;
		case 'game':
		echo "hi";
			include('page/game.php');
		break;
		case 'default':
			?>How did you get here?<?PHP
		break;
	}
	echo '</body></html>';
}



?>

