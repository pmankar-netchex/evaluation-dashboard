'use client';

import { ConversationEntry } from '@/types/salesforce';
import { useMemo } from 'react';
import { decodeHtmlEntities } from '@/lib/utils/html-entities';
import { textStyles, colors, materialComponents, materialText, materialBorder, materialTypography, materialBackground } from '@/lib/design-tokens';

interface TranscriptViewerProps {
  title: string;
  transcript: ConversationEntry[];
  highlightDifferences?: boolean;
  filterBotType?: 'agentforce' | 'sierra'; // Filter to show only specific bot type
}

export function TranscriptViewer({
  title,
  transcript,
  filterBotType,
}: TranscriptViewerProps) {
  const sortedTranscript = useMemo(() => {
    let filtered = [...transcript];
    
    // Filter messages based on bot type
    if (filterBotType) {
      filtered = filtered.filter((entry) => {
        const role = entry.sender?.role?.toLowerCase() || '';
        const appType = entry.sender?.appType?.toLowerCase() || '';
        
        // Always include customer/user messages
        if (role === 'enduser' || role === 'user') {
          return true;
        }
        
        // Include system messages
        if (role === 'system') {
          return true;
        }
        
        // Filter bot messages based on type
        if (role === 'bot' || role === 'chatbot' || role === 'virtualagent') {
          if (filterBotType === 'agentforce') {
            // Only show Agentforce bots (exclude Sierra bots)
            // Sierra bots are identified by identifier starting with "sierra-" or appType
            return !entry.identifier?.startsWith('sierra-') && appType !== 'sierra';
          } else if (filterBotType === 'sierra') {
            // Only show Sierra bots
            return entry.identifier?.startsWith('sierra-') || appType === 'sierra';
          }
        }
        
        // Include agent/human rep messages
        if (role === 'agent') {
          return true;
        }
        
        // Exclude everything else
        return false;
      });
    }
    
    return filtered.sort(
      (a, b) => a.clientTimestamp - b.clientTimestamp
    );
  }, [transcript, filterBotType]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageBgColor = (role: string, identifier?: string, appType?: string) => {
    const roleLower = role.toLowerCase();
    
    // Customer/User messages - Blue
    if (roleLower === 'enduser' || roleLower === 'user') {
      return 'bg-[#e3f2fd] border-l-4 border-[#2196f3]';
    }
    
    // Human Rep/Agent messages - Green
    if (roleLower === 'agent') {
      return 'bg-[#e8f5e9] border-l-4 border-[#4caf50]';
    }
    
    // Bot messages - Different colors for different bots
    if (roleLower === 'bot' || roleLower === 'chatbot' || roleLower === 'virtualagent') {
      // Sierra Bot - Purple
      if (identifier?.startsWith('sierra-') || appType?.toLowerCase() === 'sierra') {
        return 'bg-[#f3e5f5] border-l-4 border-[#9c27b0]';
      }
      // Agentforce Bot - Teal/Blue-green
      return 'bg-[#e0f2f1] border-l-4 border-[#009688]';
    }
    
    // System messages - Gray
    if (roleLower === 'system') {
      return 'bg-[#f5f5f5] border-l-4 border-[#9e9e9e]';
    }
    
    // Default
    return 'bg-[#f5f5f5] border-l-4 border-[#bdbdbd]';
  };

  const getRoleLabel = (role: string, identifier?: string, appType?: string) => {
    switch (role.toLowerCase()) {
      case 'enduser':
        return 'Customer';
      case 'agent':
        return 'Human Rep';
      case 'bot':
      case 'chatbot':
      case 'virtualagent':
        // Check if this is a Sierra bot
        if (identifier?.startsWith('sierra-') || appType?.toLowerCase() === 'sierra') {
          return 'Sierra Bot';
        }
        return 'Agentforce Bot';
      case 'system':
        return 'System';
      default:
        return role;
    }
  };

  return (
    <div className="flex flex-col h-full border border-[#e0e0e0] rounded-lg shadow-sm bg-white">
      <div className="px-3 py-2 bg-[#f5f5f5] border-b border-[#e0e0e0] rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium leading-5 text-[#212121]">{title}</h3>
          <span className="text-xs font-normal leading-4 text-[#757575]">
            {sortedTranscript.length} {sortedTranscript.length === 1 ? 'message' : 'messages'}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sortedTranscript.length === 0 ? (
          <div className="text-center text-sm font-normal leading-5 text-[#757575] py-8">
            No messages in this transcript
          </div>
        ) : (
          sortedTranscript.map((entry, index) => {
            const role = entry.sender?.role || 'Unknown';
            const roleLabel = getRoleLabel(role, entry.identifier, entry.sender?.appType);

            return (
              <div
                key={entry.identifier || index}
                className={`p-2.5 rounded-md ${getMessageBgColor(role, entry.identifier, entry.sender?.appType)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold leading-3 text-[#616161] uppercase tracking-wide">
                    {roleLabel}
                  </span>
                  <span className="text-[10px] font-normal leading-3 text-[#9e9e9e]">
                    {formatTimestamp(entry.clientTimestamp)}
                  </span>
                </div>
                <p className="text-[13px] font-normal leading-[18px] text-[#212121] whitespace-pre-wrap break-words mt-1">
                  {entry.messageText ? decodeHtmlEntities(entry.messageText) : '(Empty message)'}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

