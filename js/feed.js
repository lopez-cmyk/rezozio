const INITIAL_FEED_BATCH_SIZE = 5;
const filters = {
  AUTHOR: 'author',
  NOFILTERS: 'noFilters',
  SUBSCRIPTIONS: 'subscriptions'
}
const modes = {
  LOGGEDIN: 'loggedIn',
  VISITOR: 'visitor'
}
function updateButtons(mode){
  let setToVisible,setToInvisible,text;
if(mode == modes.LOGGEDIN){
  text = 'tous les messages';
  setToVisible = document.querySelector("#unfiltered_feed");
  setToInvisible = document.querySelector("#filtered_feed");
}
else{
  text = 'mes abonnements';
  setToVisible = document.querySelector("#filtered_feed");
  setToInvisible = document.querySelector("#unfiltered_feed");
}
  setToVisible.style.display='';
  setToVisible.textContent= text;
  setToInvisible.style.display = 'none';
  setToInvisible.textContent= '';
}
function visitorMode(){
  if(JSON.parse(document.body.dataset.context).filters === filters.AUTHOR)
    removeProfile();
  removeFeed();
  getFeed();
  updateButtons(modes.VISITOR)
}

function loggedInMode(){
  if(JSON.parse(document.body.dataset.context).filters === filters.AUTHOR)
    removeProfile();
  removeFeed();
  getFilteredFeed();
  updateButtons(modes.LOGGEDIN)
}

function getFeed(before=null){
    document.body.dataset.context= jsonUserToHTML(JSON.stringify({filters:filters.NOFILTERS}));
  //permet d'utiliser la même fonction pour afficher
  //après le "afficher"
  console.log("unfiltered feed");
  let init,data;
  data = new FormData();
  if(before !== null)
    data.append("before",before);
  data.append("count",INITIAL_FEED_BATCH_SIZE);
  init={method:'POST',credentials:'same-origin',body:data};
  fetchFromJson("services/findMessages.php",init)
  .then(processFeed,errorFeed);
}

function processFeed(answer){
  console.log(answer);
  if(answer.status=="ok"){
    context(answer.args);
    displayFeedHeader();
    displayFeed(answer);
    if(answer.result.length==0)
      emptyFeedHandler();
  }
  else
    displayError(answer.message,document.querySelector("#messages"));
}

function getFilteredFeed(before=null){
  console.log("récupération du feed personnalisé");
  document.body.dataset.context= jsonUserToHTML(JSON.stringify({filters:filters.SUBSCRIPTIONS}));
  let init,data;
  data = new FormData();
  if(before !== null)
    data.append("before",before);
  data.append("count",INITIAL_FEED_BATCH_SIZE);
  init={method:'POST',credentials:'same-origin',body:data};
  fetchFromJson("services/findFollowedMessages.php",{method:'POST',credentials:'same-origin'})
  .then(processFeed,errorFeed);
}

function getFeedByAuthor(author,before=null){
  console.log("recuperation du feed de : "+author);
  document.body.dataset.context= jsonUserToHTML(JSON.stringify({filters:filters.AUTHOR,author:author}));
  console.log(document.body.dataset.context);
  let data;
  data = new FormData();
  if(before !== null)
    data.append("before",before);
  data.append("author",author);
  data.append("count",INITIAL_FEED_BATCH_SIZE);
  fetchFromJson("services/findMessages.php",{method:'POST',body:data})
  .then(processFeed,errorFeed);
}

function displayFeedHeader(){
  let feedType = document.createElement('h1');
  let context = JSON.parse(document.body.dataset.context);
  let text;
  switch(context.filters){
    case filters.NOFILTERS:
      text = "Tous les messages de Rezozio";
      break;
    case filters.AUTHOR:
      text = `Messages de ${context.author}`;
      break;
    case filters.SUBSCRIPTIONS:
      text = "Messages des utilisateurs auxquels vous êtes abonné."
      break;
    default:
      text ="Je ne sais pas trop quels messages sont affiches.."
  }
  feedType.textContent = text;
  document.querySelector('#messages').appendChild(feedType);
}

function displayFeed(answer){

  for (let i = 0;i<answer.result.length;i++)
  {
      displayMessage(answer.result[i],document.querySelector("#messages"));
  }
  //si il y a autant de messages que le max autorise, on
  //peut supposer qu'il y en a à charger derrière.
  if(answer.result.length == INITIAL_FEED_BATCH_SIZE){
  let button = document.createElement("button");
  button.id="show_more_button";
  button.textContent="afficher plus";
  button.addEventListener("click",function(){displayMoreMessages(answer);});
  document.querySelector("#messages").appendChild(button);
  }
}

function displayMessage(message,element){
  let d = document.createElement('div');
  d.className="message";
  let author = document.createElement('p');
  author.className="author";
  author.textContent ="@"+message.author;

  let content = document.createElement('p');
  content.className="content";
  content.textContent=message.content;

  let date = document.createElement('p');
  date.className="date";
  date.textContent=convertIsoDate(message.datetime);

  let pseudo = document.createElement('p');
  pseudo.className="pseudo";
  pseudo.textContent=message.pseudo;

  let img = document.createElement('img');
  img.className='profile_picture';
  img.src=generateUniqueImgUrl("small",message.author);
  img.alt='photo de profil';

  //pour pouvoir les supprimer après.
  d.dataset.id= message.id;
  pseudo.addEventListener("click",function(){visitProfile(message.author);});
  author.addEventListener("click",function(){visitProfile(message.author);});
  img.addEventListener("click",function(){visitProfile(message.author);});

  d.appendChild(img);
  d.appendChild(pseudo);
  d.appendChild(author);
  d.appendChild(content);
  d.appendChild(date);
  //rajouter un mecanisme de suppression pour ses propres messages
  let dataset = document.body.dataset;
  if(dataset.hasOwnProperty("user") && message.author === JSON.parse(dataset.user).userId){
    let s = document.createElement("span");
    s.className="delete_message";
    s.textContent = "supprimer";
    s.addEventListener("click",deleteMessage);

    let e = document.createElement("div");
    e.className="message_error_zone";

    d.appendChild(s);
    d.appendChild(e);
  }
  element.appendChild(d);

}
function displayError(error,element){
  let d = document.createElement('div');
  let p = document.createElement('p');
  p.textContent = error;
  element.appendChild(d);
  d.appendChild(p);
}

function errorFeed(error){
  displayError(error,document.querySelector("#messages"));
}

function displayMoreMessages(answer){

  //on determine dans quel cas de figure on se trouve grâce aux args de la requête
  document.querySelector("#messages").removeChild(document.querySelector("#show_more_button"));
  let before = answer.result[answer.result.length-1].id;
  //mode sans filtre
  if(answer.args.author==='')
    getFeed(before);
  //mode connecte
  else if(!answer.args.hasOwnProperty("author"))
    getFilteredFeed(before);
  //filtre par auteur
  else if (answer.args.author !=='')
    getFeedByAuthor(answer.args.author,before);
}

function context(args){
  let context,f;

  //mode sans filtre
  if(args.author==='')
    f = {filters:filters.NOFILTERS};
  //mode connecte
  else if(!args.hasOwnProperty("author"))
    f = {filters:filters.SUBSCRIPTIONS};
  //filtre par auteur
  else if (args.author !=='')
    f =  {filters:filters.AUTHOR, author:args.author};

  document.body.dataset.context = jsonUserToHTML(JSON.stringify(f));
}

function deleteMessage(ev){
  let id = this.parentNode.dataset.id;
  let data = new FormData();
  data.append("messageId",id);
  fetchFromJson("services/deleteMessage.php",{method:'POST',body:data,credentials:'same-origin'})
  .then(processDeleteMessage,errorDeleteMessage);
}

function processDeleteMessage(answer){
  let context = JSON.parse(document.body.dataset.context);
  removeFeed();
  if(answer.status == "ok"){
    feedGivenContext(context);
  }
else{
  console.log(answer.message);
}

}
function errorDeleteMessage(error){
  alert("Impossible de supprimer le message :"+error);
}

function convertIsoDate(date){
  return date.substring(0,10).split('-').reverse().join('/') +" "+date.substring(11,16);
}

function emptyFeedHandler(){
  let context,content,p;
  context  = JSON.parse(document.body.dataset.context);
  content ="Il n'y a aucun message à voir ici. ";
  console.log(context);
  switch(context.filters){
    case(filters.NOFILTERS):
      content += "Aucun utilisateur de Rezozio n'a publie de message pour l'instant.";
      break;
    case(filters.AUTHOR):
      content += context.author+" n'a pas publie de message pour l'instant.";
      break;
    case(filters.SUBSCRIPTIONS):
      content += " Aucun des utilisateurs que vous suivez n'a publie de message pour l'instant.";
      break;
    default:
      content+=" Je ne sais pas pourquoi.";
    }
    p= document.createElement('p');
    p.className='empty_feed_message';
    p.textContent=content;
    document.querySelector("#messages").appendChild(p);
 }

function feedGivenContext(context){
  switch(context.filters){
    case filters.NOFILTERS:
      getFeed();
      break;
    case filters.SUBSCRIPTIONS:
      getFilteredFeed();
      break;
    case filters.AUTHOR:
      getFeedByAuthor(context.author);
      break;
    default:
      getFeed();
  }
}
