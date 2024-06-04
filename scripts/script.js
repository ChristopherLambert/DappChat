const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
let user = gun.user();
const SEA = Gun.SEA;
var pair = SEA.pair();
// Função para registrar um novo usuário
function signUp() {
  const alias = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  user.create(alias, pass, ack => {
    if (ack.err) {
      console.error('Error signing up:', ack.err);
      showError('Error signing up:', ack.err);
    } else {
      signIn();
    }
  });
}
// Função para autenticar um usuário existente
function signIn() {
  const alias = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  user.auth(alias, pass, ack => {
    if (ack.err) {
      console.error('Error signing in:', ack.err);
      showError('Error signing in:', ack.err);
    } else {
      document.getElementById('chat').style.display = 'block';
      subscribeMessages();
    }
  });
}
// Função para enviar uma mensagem privada
function sendMessage() {
  const recipientAlias = document.getElementById('recipient').value;
  const message = document.getElementById('message').value;
  if (!recipientAlias || !message) return;
  // Obter a chave pública do destinatário
  gun.get('~@' + recipientAlias).once(data => {
    console.log('Recipient data:', data);
    if (!data) {
        console.error('Recipient not found');
        return;
    }
  
    let recipientPub = null;
    for (let key in data) {
    if (key.startsWith('~')) {
          recipientPub = key.replace('~', '');
          break;
      }
    }
    if (recipientPub) {
      SEA.encrypt(message, pair).then(encryptedMessage => {
        const messageObject = {
          from: user.is.alias,
          message: encryptedMessage,
          timestamp: Date.now()
        };
        // Salvar a mensagem no nó do destinatário
        // gun.get('~' + recipientPub).get('messages').set(messageObject)
        gun.user(recipientPub).get('messages').set(messageObject)
          .then(() => {
            console.log('Message sent successfully:', messageObject);
            document.getElementById('message').value = '';
          })
          .catch(error => {
            console.error('Error sending message:', error);
          });
      }).catch(error => {
        console.error('Error encrypting message:', error);
      });
    } else {
      console.error('Public key not found');
    }
  });
}
// Função para exibir mensagens recebidas
function displayMessage(msg) {
  console.log('Received message:', msg);
  // Verificar se o campo "from" e "message" existem
  if (msg.from && msg.message) {
      // Extrair o conteúdo cifrado da mensagem
      const encryptedMessage = msg.message;
      // Decifrar a mensagem
      SEA.decrypt(encryptedMessage, pair).then(decryptedMessage => {
          // Verificar se a mensagem foi decifrada com sucesso
          if (decryptedMessage) {
              // Criar um novo elemento div para exibir a mensagem decifrada
              const messagesDiv = document.getElementById('messages');
              const messageDiv = document.createElement('div');
              const time = new Date(msg.timestamp).toLocaleTimeString();
              messageDiv.textContent = `${time} - ${msg.from}: ${decryptedMessage}`;
              messagesDiv.appendChild(messageDiv);
              messagesDiv.scrollTop = messagesDiv.scrollHeight;
          } else {
              console.error('Erro ao decifrar a mensagem:', msg);
          }
      }).catch(error => {
          console.error('Erro ao decifrar a mensagem:', msg, error);
      });
  } else {
      console.error('Mensagem inválida:', msg);
  }
}

// Função para subscrever e receber mensagens
function subscribeMessages() {
  console.log(user);
  const userPub = user.is.pub;
  console.log('Subscribed to messages for user:', userPub);
    // messages.once((data, key) => {
    //    console.log('Data in messages node:', data);
    // });
   // Acessar o nó de mensagens do usuário atual
   gun.user(userPub).get('messages').map().on((msg, id) => {
       displayMessage(msg);
   });
}
function showError(title, msg){
  Swal.fire({
    icon: "error",
    title: title,
    text: msg,
  });
}
// Função de logout
function logout() {
  user.leave();
  document.getElementById('chat').style.display = 'none';
  document.querySelector('.auth-container').style.display = 'block';
}

// Lembrar estado de autenticação entre recarregamentos de página
// user.recall({ sessionStorage: true });