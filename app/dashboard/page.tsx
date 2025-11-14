'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TranscriptViewer } from '@/components/transcript-viewer';
import { EvaluationForm } from '@/components/evaluation-form';
import { CaseLoader } from '@/components/case-loader';
import { Toast } from '@/components/toast';
import { Transcript, Winner, EvaluationScores } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { textStyles, colors, materialComponents, materialText, materialBorder, materialTypography, materialBackground } from '@/lib/design-tokens';

export default function DashboardPage() {
  const [currentTranscript, setCurrentTranscript] = useState<Transcript | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingSierra, setGeneratingSierra] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ evaluated: number; total: number } | null>(null);
  const [navigationState, setNavigationState] = useState<{
    position: { current: number; total: number };
    hasNext: boolean;
    hasPrevious: boolean;
  } | null>(null);
  const [sierraProgress, setSierraProgress] = useState<{
    current: number;
    total: number;
    message: string;
    status: 'processing' | 'complete' | 'error' | null;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  const router = useRouter();
  const supabase = createClient();

  // Fetch progress stats
  const fetchProgress = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get total transcripts
      const { count: totalCount } = await supabase
        .from('transcripts')
        .select('*', { count: 'exact', head: true });

      // Get evaluated count for this user
      const { count: evaluatedCount } = await supabase
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('evaluator_id', user.id);

      setProgress({
        evaluated: evaluatedCount || 0,
        total: totalCount || 0,
      });
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const loadTranscript = async (caseNumber: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/transcripts/${caseNumber}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load transcript');
      }

      const transcript: Transcript = await response.json();
      setCurrentTranscript(transcript);
      // Update navigation state after loading
      await updateNavigationState(transcript.id);
    } catch (err: any) {
      setError(err.message || 'Failed to load transcript');
      console.error('Error loading transcript:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTranscriptWithNavigation = async (direction: 'next' | 'previous' = 'next') => {
    setLoading(true);
    setError(null);

    try {
      const currentId = currentTranscript?.id || null;
      const params = new URLSearchParams({
        direction,
        ...(currentId && { current: currentId }),
      });

      const response = await fetch(`/api/transcripts/navigation?${params}`);
      if (!response.ok) {
        if (response.status === 404) {
          const data = await response.json();
          setError(data.message || (direction === 'next' ? 'No unevaluated transcripts found' : 'No previous transcript'));
          setLoading(false);
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load transcript');
      }

      const data = await response.json();
      setCurrentTranscript(data.transcript);
      setNavigationState({
        position: data.position,
        hasNext: data.hasNext,
        hasPrevious: data.hasPrevious,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load transcript');
      console.error('Error loading transcript:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNextTranscript = useCallback(() => {
    loadTranscriptWithNavigation('next');
  }, [currentTranscript?.id]);

  const loadPreviousTranscript = useCallback(() => {
    loadTranscriptWithNavigation('previous');
  }, [currentTranscript?.id]);

  const updateNavigationState = async (transcriptId: string) => {
    try {
      const params = new URLSearchParams({ current: transcriptId });
      const response = await fetch(`/api/transcripts/navigation?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNavigationState({
          position: data.position,
          hasNext: data.hasNext,
          hasPrevious: data.hasPrevious,
        });
      }
    } catch (err) {
      console.error('Error updating navigation state:', err);
    }
  };

  const handleSubmitEvaluation = async (evaluation: {
    winner: Winner;
    scores: EvaluationScores;
    notes?: string;
  }) => {
    if (!currentTranscript?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript_id: currentTranscript.id,
          ...evaluation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit evaluation');
      }

      // Show success toast
      setToast({
        message: 'Evaluation submitted successfully!',
        type: 'success',
        isVisible: true,
      });

      // Refresh progress
      await fetchProgress();

      // Load next transcript after a short delay to show the toast
      setTimeout(async () => {
        const currentId = currentTranscript?.id || null;
        const params = new URLSearchParams({
          direction: 'next',
          ...(currentId && { current: currentId }),
        });

        try {
          const response = await fetch(`/api/transcripts/navigation?${params}`);
          if (!response.ok) {
            if (response.status === 404) {
              setToast({
                message: 'All transcripts have been evaluated!',
                type: 'info',
                isVisible: true,
              });
              setError('No unevaluated transcripts found');
              setLoading(false);
              return;
            }
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to load transcript');
          }

          const data = await response.json();
          setCurrentTranscript(data.transcript);
          setNavigationState({
            position: data.position,
            hasNext: data.hasNext,
            hasPrevious: data.hasPrevious,
          });
          setError(null);
        } catch (err: any) {
          setError(err.message || 'Failed to load next transcript');
          console.error('Error loading next transcript:', err);
        } finally {
          setLoading(false);
        }
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit evaluation');
      setToast({
        message: err.message || 'Failed to submit evaluation',
        type: 'error',
        isVisible: true,
      });
      console.error('Error submitting evaluation:', err);
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    await loadTranscriptWithNavigation('next');
  };

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'ArrowRight' && !loading && navigationState?.hasNext) {
        e.preventDefault();
        loadNextTranscript();
      } else if (e.key === 'ArrowLeft' && !loading && navigationState?.hasPrevious) {
        e.preventDefault();
        loadPreviousTranscript();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, navigationState, loadNextTranscript, loadPreviousTranscript]);

  const generateSierraTranscript = async () => {
    if (!currentTranscript?.case_number && !currentTranscript?.id) {
      setError('No case number or transcript ID available');
      return;
    }

    setGeneratingSierra(true);
    setError(null);
    setSierraProgress(null);

    try {
      // Use case_number if available, otherwise we can't proceed
      const caseNumber = currentTranscript.case_number;
      if (!caseNumber) {
        throw new Error('Case number is required to generate Sierra transcript');
      }

      console.log('Generating Sierra transcript for case:', caseNumber);
      
      // Use fetch with streaming response for Server-Sent Events
      const response = await fetch(`/api/transcripts/${caseNumber}/generate`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Try to parse error as JSON, but handle HTML error pages
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.details || 'Failed to start Sierra transcript generation');
        } else {
          const errorText = await response.text();
          console.error('Non-JSON error response:', errorText.substring(0, 200));
          throw new Error(`Failed to start Sierra transcript generation (HTTP ${response.status})`);
        }
      }

      // Check if response is actually a stream
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('text/event-stream')) {
        // If not a stream, try to parse as JSON
        const data = await response.json();
        if (data.type === 'error') {
          throw new Error(data.message || data.details || 'Failed to generate Sierra transcript');
        }
        // If it's a complete response, use it directly
        if (data.transcript) {
          setCurrentTranscript(data.transcript);
          setGeneratingSierra(false);
          return;
        }
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to get response stream');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('Progress update:', data);

              if (data.type === 'progress') {
                setSierraProgress({
                  current: data.current,
                  total: data.total,
                  message: data.message,
                  status: data.status,
                });
              } else if (data.type === 'saving') {
                setSierraProgress((prev) => ({
                  ...prev!,
                  message: data.message,
                }));
              } else if (data.type === 'complete') {
                setSierraProgress({
                  current: data.transcript?.sierra_transcript?.length || 0,
                  total: data.transcript?.sierra_transcript?.length || 0,
                  message: data.message,
                  status: 'complete',
                });
                setCurrentTranscript(data.transcript);
                setTimeout(() => {
                  setGeneratingSierra(false);
                  setSierraProgress(null);
                }, 2000);
                return;
              } else if (data.type === 'error') {
                setError(data.message || data.details || 'Failed to generate Sierra transcript');
                setSierraProgress((prev) => ({
                  ...prev!,
                  status: 'error',
                  message: data.message || data.details || 'Error occurred',
                }));
                setGeneratingSierra(false);
                return;
              }
            } catch (parseError) {
              console.error('Error parsing SSE message:', parseError);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate Sierra transcript');
      console.error('Error generating Sierra transcript:', err);
      setGeneratingSierra(false);
      setSierraProgress(null);
    }
  };

  const hasSierraTranscript = () => {
    return currentTranscript?.sierra_transcript && 
           Array.isArray(currentTranscript.sierra_transcript) && 
           currentTranscript.sierra_transcript.length > 0;
  };

  return (
    <div className="space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
        duration={3000}
      />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-normal leading-[40px] text-[#212121]">Evaluation Dashboard</h1>
          <p className="mt-1 text-sm font-normal leading-5 text-[#757575]">
            Compare Agentforce and Sierra chatbot conversations side-by-side
          </p>
        </div>
      </div>

      <CaseLoader
        onLoadCase={loadTranscript}
        loading={loading}
        currentCaseNumber={currentTranscript?.case_number}
      />

      {error && (
        <div className="rounded-lg bg-[#ffebee] border border-[#f44336] p-4">
          <p className="text-sm font-normal leading-5 text-[#c62828]">{error}</p>
        </div>
      )}

      {loading && !currentTranscript && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2196f3]"></div>
          <p className="mt-2 text-sm font-normal leading-5 text-[#757575]">Loading transcript...</p>
        </div>
      )}

      {currentTranscript && (
        <div className="space-y-6">
          {/* Sierra Generation Button */}
          {!hasSierraTranscript() && (
            <div className="bg-[#fff3e0] border border-[#ff9800] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium leading-5 text-[#212121]">
                    Sierra transcript not generated
                  </h3>
                  <p className="text-xs font-normal leading-4 text-[#757575] mt-1">
                    Click the button below to generate the Sierra transcript by replaying the conversation.
                  </p>
                  
                  {/* Progress Indicator */}
                  {sierraProgress && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#757575]">
                        <span>{sierraProgress.message}</span>
                        {sierraProgress.total > 0 && (
                          <span className="font-medium text-[#212121]">
                            {sierraProgress.current} / {sierraProgress.total}
                          </span>
                        )}
                      </div>
                      {sierraProgress.total > 0 && (
                        <div className="w-full bg-[#e0e0e0] rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              sierraProgress.status === 'error'
                                ? 'bg-[#f44336]'
                                : sierraProgress.status === 'complete'
                                ? 'bg-[#4caf50]'
                                : 'bg-[#2196f3]'
                            }`}
                            style={{
                              width: `${Math.min(100, (sierraProgress.current / sierraProgress.total) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                      {sierraProgress.status === 'complete' && (
                        <p className="text-xs text-[#4caf50] font-medium">✓ Generation complete!</p>
                      )}
                      {sierraProgress.status === 'error' && (
                        <p className="text-xs text-[#f44336] font-medium">✗ Error occurred</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <button
                    onClick={generateSierraTranscript}
                    disabled={generatingSierra || loading}
                    className="bg-[#ff9800] text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-[#fb8c00] focus:outline-none focus:ring-2 focus:ring-[#ff9800] focus:ring-offset-2 disabled:bg-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed whitespace-nowrap transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    {generatingSierra ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        Generating...
                      </>
                    ) : (
                      'Generate Sierra Transcript'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-side transcript viewers */}
          <div className={`grid gap-6 ${hasSierraTranscript() ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`} style={{ minHeight: '600px' }}>
            <TranscriptViewer
              title="🤖 Agentforce"
              transcript={currentTranscript.agentforce_transcript}
              filterBotType="agentforce"
            />
            {hasSierraTranscript() ? (
              <TranscriptViewer
                title="🏔️ Sierra"
                transcript={currentTranscript.sierra_transcript}
                filterBotType="sierra"
              />
            ) : (
              <div className="flex items-center justify-center bg-[#f5f5f5] border border-[#e0e0e0] rounded-lg">
                <div className="text-center p-8">
                  <p className="text-sm font-normal leading-5 text-[#212121] mb-4">Sierra transcript will appear here</p>
                  <p className="text-xs font-normal leading-4 text-[#757575]">Click "Generate Sierra Transcript" above to create it</p>
                </div>
              </div>
            )}
          </div>

          {/* Evaluation form - only show if Sierra transcript exists */}
          {hasSierraTranscript() && (
            <EvaluationForm
              onSubmit={handleSubmitEvaluation}
              onSkip={handleSkip}
              disabled={loading || generatingSierra}
            />
          )}
        </div>
      )}

      {!currentTranscript && !loading && (
        <div className="text-center py-12 bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
          <p className="text-sm font-normal leading-5 text-[#212121]">
            Enter a case number above or click "Next Unevaluated" to start evaluating
          </p>
        </div>
      )}
    </div>
  );
}

