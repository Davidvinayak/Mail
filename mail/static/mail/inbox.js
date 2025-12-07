document.addEventListener('DOMContentLoaded', function() {

  // Navigation buttons
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // Handle sending email
  document.querySelector('#compose-form').onsubmit = send_mail;

  // Load inbox by default
  load_mailbox('inbox');
});


function compose_email() {

  // Show compose view, hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-details-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear form fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}


function load_mailbox(mailbox) {
  
  // Show mailbox, hide others
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-details-view').style.display = 'none';

  // Set mailbox title
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Load emails in this mailbox
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {

    emails.forEach(email => {

      const element = document.createElement('div');
      element.className = 'email-item';
      element.style.border = "1px solid #ccc";
      element.style.padding = "10px";
      element.style.margin = "10px";
      element.style.cursor = "pointer";
      element.style.backgroundColor = email.read ? "#e6e6e6" : "white";

      // IMPORTANT: show TO: in Sent mailbox, FROM: in all others
      const name_to_display = mailbox === 'sent'
        ? email.recipients.join(', ')
        : email.sender;

      element.innerHTML = `
        <strong>${name_to_display}</strong> — ${email.subject}
        <span style="float:right">${email.timestamp}</span>
      `;

      // Clicking opens the email
      element.addEventListener('click', () => view_email(email.id, mailbox));

      document.querySelector('#emails-view').append(element);
    });

  });
}


function send_mail(e) {
  e.preventDefault();

  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: document.querySelector('#compose-recipients').value,
      subject: document.querySelector('#compose-subject').value,
      body: document.querySelector('#compose-body').value
    })
  })
  .then(response => response.json())
  .then(result => {
    console.log(result);
    load_mailbox('sent');  // After sending, show Sent mailbox
  });
}


function view_email(id, mailbox) {

  // Show only the details view
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-details-view').style.display = 'block';

  // Clear previous content
  document.querySelector('#email-details-view').innerHTML = '';

  fetch(`/emails/${id}`)
  .then(response => response.json())
  .then(email => {

    // Mark as read
    fetch(`/emails/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ read: true })
    });

    // Display email contents
    const details = `
      <h3>${email.subject}</h3>
      <p><strong>From:</strong> ${email.sender}</p>
      <p><strong>To:</strong> ${email.recipients.join(', ')}</p>
      <p><strong>Timestamp:</strong> ${email.timestamp}</p>
      <hr>
      <p>${email.body}</p>
      <hr>
    `;

    document.querySelector('#email-details-view').innerHTML = details;

    // ARCHIVE / UNARCHIVE buttons (not for Sent mailbox)
    if (mailbox !== 'sent') {

      const archiveButton = document.createElement('button');
      archiveButton.innerHTML = email.archived ? 'Unarchive' : 'Archive';

      archiveButton.addEventListener('click', () => {
        fetch(`/emails/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ archived: !email.archived })
        })
        .then(() => load_mailbox('inbox'));
      });

      document.querySelector('#email-details-view').append(archiveButton);
    }

    // REPLY button
    const replyButton = document.createElement('button');
    replyButton.innerHTML = 'Reply';
    replyButton.style.marginLeft = '10px';

    replyButton.addEventListener('click', () => reply_email(email));
    document.querySelector('#email-details-view').append(replyButton);

  });
}


function reply_email(email) {

  compose_email();

  // Prefill data
  document.querySelector('#compose-recipients').value = email.sender;

  let subject = email.subject;
  if (!subject.startsWith("Re:")) {
    subject = "Re: " + subject;
  }
  document.querySelector('#compose-subject').value = subject;

  document.querySelector('#compose-body').value =
    `On ${email.timestamp} ${email.sender} wrote:\n${email.body}\n\n`;
}
