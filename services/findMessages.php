<?php
/**args : author(défaut : vide), before(défaut : vide),count(défaut : 15)
*result: tableau de {messageid,author,pseudo,content,datetime
*/
require_once('../lib/DataLayer.class.php');
require_once('../lib/common_service.php');
$args = new RequestParameters();
$args->defineString('author');
$args->defineInt('before',['default'=>0,'min_range'=>0]);
$args->defineInt('count',['default'=>15,'min_range'=>0]);
if(! $args->isValid()){
  produceError('Arguments invalides pour l\'accès au service.'.implode(', ',$args->getErrorMessages()));
  return;
}

try{
  $data = new DataLayer();
  if(! $data->getUser($args->author)){
    produceError('Impossible de récupérer les messages, l\'utlisateur n\'existe pas.');
    return;
  }
  $res = $data->findMessages($args->author,$args->before,$args->count);
  produceResult($res);
}catch(PDOException $e){
  produceError($e->getMessage());
}
 ?>
