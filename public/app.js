const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');

const messages = [];

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = `<div class="message-content">${formatMessage(content)}</div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function formatMessage(text) {
  // Convert markdown-style formatting to HTML
  let html = text;

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

  // Tables
  html = html.replace(/(?:^|\n)(\|.+\|(?:\n\|.+\|)+)/g, (match, table) => {
    const rows = table.trim().split('\n');
    let tableHtml = '<table>';
    rows.forEach((row, i) => {
      // Skip separator row
      if (row.match(/^\|[\s-:|]+\|$/)) return;
      const cells = row.split('|').filter(c => c.trim());
      const tag = i === 0 ? 'th' : 'td';
      tableHtml += '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
    });
    tableHtml += '</table>';
    return tableHtml;
  });

  // Unordered lists
  html = html.replace(/(?:^|\n)((?:[-*] .+\n?)+)/g, (match, list) => {
    const items = list.trim().split('\n').map(item =>
      `<li>${item.replace(/^[-*] /, '')}</li>`
    ).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/(?:^|\n)((?:\d+\. .+\n?)+)/g, (match, list) => {
    const items = list.trim().split('\n').map(item =>
      `<li>${item.replace(/^\d+\. /, '')}</li>`
    ).join('');
    return `<ol>${items}</ol>`;
  });

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Paragraphs - split by double newlines
  html = html.split(/\n\n+/).map(block => {
    block = block.trim();
    if (!block) return '';
    // Don't wrap if already an HTML block element
    if (block.match(/^<(table|ul|ol|h[1-6]|pre|blockquote)/)) return block;
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'typing';
  div.id = 'typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function removeTyping() {
  const typing = document.getElementById('typing');
  if (typing) typing.remove();
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;

  addMessage('user', text);
  messages.push({ role: 'user', content: text });

  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    const data = await res.json();
    removeTyping();

    if (data.error) {
      addMessage('assistant', 'Something went wrong. Please try again.');
    } else {
      addMessage('assistant', data.reply);
      messages.push({ role: 'assistant', content: data.reply });
    }
  } catch (err) {
    removeTyping();
    addMessage('assistant', 'Connection error. Please try again.');
  }

  sendBtn.disabled = false;
  input.focus();
}

sendBtn.addEventListener('click', sendMessage);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 150) + 'px';
});
