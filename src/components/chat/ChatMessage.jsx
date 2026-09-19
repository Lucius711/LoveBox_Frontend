import { Bot } from 'lucide-react';
import RichCard from './cards/RichCard';

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

export default function ChatMessage({ msg, isThinking, onQuickReply, onAction }) {
  const isUser = msg.role === 'user';

  if (isThinking && !msg.content) {
    return (
      <div className="flex items-end gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="bg-white border border-pink-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          <div className="flex gap-1 items-center">
            <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  const hasQuickReplies = !msg.streaming && msg.quickReplies?.length > 0;
  const hasActions = !msg.streaming && msg.actions?.length > 0;

  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="max-w-[85%] flex flex-col gap-1.5">
        {msg.content && (
          <div className="bg-white border border-pink-100 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm text-sm text-gray-700 leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
            {msg.streaming && (
              <span className="inline-block w-0.5 h-4 bg-pink-400 ml-0.5 animate-pulse align-text-bottom" />
            )}
          </div>
        )}

        <RichCard card={msg.card} />

        {/* Quick replies — suggested follow-up questions */}
        {hasQuickReplies && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {msg.quickReplies.map((qr, i) => {
              const label = typeof qr === 'string' ? qr : (qr?.label || qr?.text || '');
              const value = typeof qr === 'string' ? qr : (qr?.text  || qr?.label || '');
              return (
                <button
                  key={i}
                  onClick={() => onQuickReply?.(value)}
                  className="text-xs bg-pink-50 hover:bg-pink-100 active:scale-95 border border-pink-200 text-pink-600 rounded-full px-3 py-1.5 transition-all font-medium"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Action buttons — navigate or send */}
        {hasActions && (
          <div className="flex flex-wrap gap-2 mt-0.5">
            {msg.actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  if (action.type === 'navigate') {
                    window.location.href = action.value;
                  } else {
                    onAction?.(action);
                  }
                }}
                className="text-xs bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl px-3 py-1.5 hover:opacity-90 active:scale-95 transition-all font-medium shadow-sm"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
