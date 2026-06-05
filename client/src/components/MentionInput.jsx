import React from 'react';
import { MentionsInput, Mention } from 'react-mentions';

const MentionInput = ({ 
  value, 
  onChange, 
  onKeyDown,
  placeholder, 
  className, 
  fetchSuggestions, 
  inputRef,
  singleLine = false 
}) => {

  const style = {
    control: {
      backgroundColor: 'transparent',
      fontSize: 14,
      fontWeight: 'normal',
    },
    '&multiLine': {
      control: {
        fontFamily: 'inherit',
        minHeight: singleLine ? undefined : 100,
      },
      highlighter: {
        padding: 16,
        border: '2px solid transparent',
      },
      input: {
        padding: 16,
        outline: 'none',
        border: 'none',
      },
    },
    '&singleLine': {
      display: 'inline-block',
      width: '100%',
      highlighter: {
        padding: '14px 20px',
        border: '2px solid transparent',
      },
      input: {
        padding: '14px 20px',
        outline: 'none',
        border: 'none',
      },
    },
    suggestions: {
      list: {
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        marginTop: 4,
      },
      item: {
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        '&focused': {
          backgroundColor: 'var(--border)',
        },
      },
    },
  };

  const renderSuggestion = (suggestion, search, highlightedDisplay, index, focused) => (
    <div className={`flex items-center gap-3 ${focused ? 'bg-slate-100 dark:bg-zinc-800' : ''} p-2 rounded-xl transition-colors`}>
      <img 
        src={suggestion.profilePicture || `https://ui-avatars.com/api/?name=${suggestion.display}`} 
        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-zinc-700" 
        alt="" 
      />
      <span className="text-sm font-bold text-slate-900 dark:text-white">{suggestion.display}</span>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <MentionsInput
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={style}
        singleLine={singleLine}
        inputRef={inputRef}
        className="w-full h-full text-slate-900 dark:text-white"
        a11ySuggestionsListLabel={"Suggested mentions"}
        allowSpaceInQuery
      >
        <Mention
          trigger="@"
          data={fetchSuggestions}
          renderSuggestion={renderSuggestion}
          displayTransform={(id, display) => `@${display}`}
          className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 rounded px-1"
          appendSpaceOnAdd
        />
      </MentionsInput>
    </div>
  );
};

export default MentionInput;
