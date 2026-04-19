import API_BASE from '../constants/api';

const aiService = {
  /**
   * Send a chat message with full conversation history + product context
   * @param {Array} messages - [{text, isBot}]
   * @param {Object} product - current product object
   * @returns {Promise<string>} AI reply text
   */
  async sendMessage(messages, product) {
    const response = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, product }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'AI service error');
    }

    return { reply: data.reply, relatedProducts: data.relatedProducts || [] };
  },

  // Quick suggestion chips shown at the start of the chat
  getSuggestions(product) {
    const suggestions = [
      'compare this to the samsung products avaliable',
      'Is this worth the price?',
      'What are the key features?',
      'Who is this best suited for?',
    ];

    if (product?.category === 'Electronics') {
      suggestions.push('Is it compatible with other devices?');
      suggestions.push('What warranty does it come with?');
    } else if (product?.category === 'Fashion') {
      suggestions.push('How does the sizing run?');
      suggestions.push('What material is it made of?');
    } else {
      suggestions.push('Are there similar alternatives?');
      suggestions.push('How long will delivery take?');
    }

    return suggestions.slice(0, 4);
  },
};

export default aiService;
