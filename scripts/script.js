const gun = Gun(['https://gun-manhattan.herokuapp.com/gun']);
let user = gun.user();
const SEA = Gun.SEA;
var pair = SEA.pair();

// Rastreador de mensagens exibidas
const displayedMessages = new Set();

// Função para registrar um novo usuário
function signUp() {
  const alias = $('#username').val();
  const pass = $('#password').val();
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
  const alias = $('#username').val();
  const pass = $('#password').val();
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
  const recipientAlias = $('#recipient').val();
  const message = $('#message').val();
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
            $('#message').val('');
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
function displayMessage(msg, id) {
  console.log('Received message:', msg);
  // Verificar se o campo "from" e "message" existem
  if (msg.from && msg.message) {
      // Extrair o conteúdo cifrado da mensagem
      const encryptedMessage = msg.message;
      // Decifrar a mensagem
      SEA.decrypt(encryptedMessage, pair).then(decryptedMessage => {
          // Verificar se a mensagem foi decifrada com sucesso
          if (decryptedMessage) {
              if (!msg.timestamp || displayedMessages.has(id)) return; // Verifique se os dados são válidos e não repetidos

              displayedMessages.add(id); // Marque a mensagem como exibida
              // Criar um novo elemento div para exibir a mensagem decifrada
              const time = new Date(msg.timestamp).toLocaleTimeString();
              const messageDiv = $('<div>').text(`${time} - ${msg.from}: ${decryptedMessage}`);
              $('#messages').append(messageDiv);
              $('#messages').scrollTop($('#messages')[0].scrollHeight);
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
       displayMessage(msg, id);
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
  $('#chat').hide();
  $('.auth-container').show();
}

// Lembrar estado de autenticação entre recarregamentos de página
// user.recall({ sessionStorage: true });

// Habilitar/Desabilitar botões de Sign Up e Sign In
function toggleAuthButtons() {
    const username = $('#username').val();
    const password = $('#password').val();
    if (username && password) {
        $('#signup-button, #signin-button').prop('disabled', false);
    } else {
        $('#signup-button, #signin-button').prop('disabled', true);
    }
}

toggleAuthButtons();
$('#username, #password').on('input', toggleAuthButtons);