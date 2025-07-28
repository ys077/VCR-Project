import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Command, Theme, LanguageOption, supportedLanguages, Page, Status, AudioFeedbackMode } from './types';
import { getRobotCommand } from './services/geminiService';
import HomePage from './components/HomePage';
import SettingsPage from './components/SettingsPage';
import LegalPage from './components/LegalPage';
import { I18nProvider, useI18n } from './hooks/useI18n';
import { audioService } from './services/audioService';

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const getStoredValue = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

const defaultSettings = {
    theme: 'dark' as Theme,
    language: supportedLanguages[0],
    audioFeedbackMode: 'sound' as AudioFeedbackMode,
};

const App: React.FC = () => {
    const [theme, setThemeState] = useState<Theme>(() => getStoredValue<Theme>('robot-theme', defaultSettings.theme));
    const [language, setLanguageState] = useState<LanguageOption>(() => getStoredValue<LanguageOption>('robot-language', defaultSettings.language));
    const [audioFeedbackMode, setAudioFeedbackModeState] = useState<AudioFeedbackMode>(() => getStoredValue<AudioFeedbackMode>('robot-audio-mode', defaultSettings.audioFeedbackMode));

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        try {
            localStorage.setItem('robot-theme', JSON.stringify(theme));
        } catch (error) { console.warn(`Error setting localStorage:`, error); }
    }, [theme]);
    
    useEffect(() => {
        try {
            localStorage.setItem('robot-language', JSON.stringify(language));
        } catch (error) { console.warn(`Error setting localStorage:`, error); }
    }, [language]);
    
    useEffect(() => {
        try {
            localStorage.setItem('robot-audio-mode', JSON.stringify(audioFeedbackMode));
            audioService.setMode(audioFeedbackMode);
        } catch (error) { console.warn(`Error setting localStorage:`, error); }
    }, [audioFeedbackMode]);


    const resetSettings = useCallback(() => {
        setThemeState(defaultSettings.theme);
        setLanguageState(defaultSettings.language);
        setAudioFeedbackModeState(defaultSettings.audioFeedbackMode);
        audioService.click();
    }, []);

    const setLanguage = useCallback((newLanguageCode: string) => {
        const newLang = supportedLanguages.find(l => l.code === newLanguageCode) || supportedLanguages[0];
        setLanguageState(newLang);
        audioService.toggle();
    }, []);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        audioService.toggle();
    }, []);
    
    const setAudioFeedbackMode = useCallback((mode: AudioFeedbackMode) => {
        setAudioFeedbackModeState(mode);
        audioService.setMode(mode);
        audioService.toggle();
    }, []);


    return (
        <I18nProvider language={language}>
             <main>
                <AppUI
                    theme={theme} 
                    setTheme={setTheme} 
                    language={language} 
                    setLanguage={setLanguage}
                    audioFeedbackMode={audioFeedbackMode}
                    setAudioFeedbackMode={setAudioFeedbackMode}
                    resetSettings={resetSettings}
                />
            </main>
        </I18nProvider>
    );
};

interface AppUIProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    language: LanguageOption;
    setLanguage: (code: string) => void;
    audioFeedbackMode: AudioFeedbackMode;
    setAudioFeedbackMode: (mode: AudioFeedbackMode) => void;
    resetSettings: () => void;
}

const AppUI: React.FC<AppUIProps> = (props) => {
    const [page, setPage] = useState<Page>('home');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<Status>({ key: 'home.status.default' });
    const [lastCommand, setLastCommand] = useState<Command | null>(null);
    const [obstaclesDetected] = useState(true);
    const recognitionRef = useRef<any>(null);
    const { t } = useI18n();

    const speakStatus = useCallback((statusToSpeak: Status) => {
        if (typeof statusToSpeak === 'string') {
            audioService.speak(statusToSpeak, props.language.code);
            return;
        }
        const textToSpeak = t(statusToSpeak.key as any, statusToSpeak.values);
        audioService.speak(textToSpeak, props.language.code);
    }, [props.language.code, t]);
    
    const processCommand = useCallback(async (transcript: string) => {
        setIsLoading(true);
        const processingStatus: Status = { key: 'home.status.processing', values: { transcript } };
        setStatus(processingStatus);
        speakStatus(processingStatus);
        try {
            const systemInstruction = t('gemini.systemInstruction');
            const result = await getRobotCommand(transcript, systemInstruction);
            handleCommand(result.command);
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStatus: Status = { key: 'home.status.error', values: { error: errorMessage } };
            setStatus(errorStatus);
            speakStatus(errorStatus);
            setLastCommand(Command.UNKNOWN);
        } finally {
            setIsLoading(false);
        }
    }, [t, speakStatus, props.language.code]);

    useEffect(() => {
        if (!SpeechRecognition) {
            setStatus({ key: 'home.status.browserNotSupported' });
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = props.language.code;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            const newStatus: Status = { key: 'home.status.listening' };
            setStatus(newStatus);
            speakStatus(newStatus);
            setLastCommand(null);
        };

        recognition.onend = () => {
            setIsListening(false);
            if (!isLoading) {
                setStatus({ key: 'home.status.default' });
            }
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
            const errorStatus: Status = { key: 'home.status.error', values: { error: event.error } };
            setStatus(errorStatus);
            speakStatus(errorStatus);
            setIsListening(false);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            processCommand(transcript);
        };
        
        recognitionRef.current = recognition;
    }, [processCommand, props.language.code, isLoading, speakStatus]);

    const handleSpeakClick = () => {
        audioService.click();
        if (isListening || isLoading) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
    };
    
    const handleCommand = (command: Command) => {
        audioService.click();
        setLastCommand(command);
        if (command === Command.UNKNOWN) {
             const unknownStatus: Status = { key: 'home.status.unknown' };
             setStatus(unknownStatus);
             speakStatus(unknownStatus);
             return;
        }

        setIsLoading(true);
        const commandText = t(`home.controls.${command}` as any);
        const executingStatus: Status = { key: 'home.status.executing', values: { command: commandText } };
        setStatus(executingStatus);
        speakStatus(executingStatus);
        
        setTimeout(() => {
            setStatus({ key: 'home.status.completed', values: { command: commandText } });
            setIsLoading(false);
            setTimeout(() => {
              setLastCommand(null);
              setStatus({ key: 'home.status.default' });
            }, 2000);
        }, 1500);
    };

    const mainContent = () => {
        switch (page) {
            case 'settings':
                return (
                    <SettingsPage 
                        {...props}
                        onBack={() => { setPage('home'); audioService.click(); }}
                        onNavigateToLegal={(pageType) => { setPage(pageType); audioService.click(); }}
                    />
                );
            case 'terms':
            case 'privacy':
                return (
                    <LegalPage
                        pageType={page}
                        onBack={() => { setPage('settings'); audioService.click(); }}
                    />
                );
            case 'home':
            default:
                return (
                    <HomePage 
                        status={status}
                        isListening={isListening}
                        isLoading={isLoading}
                        lastCommand={lastCommand}
                        obstaclesDetected={obstaclesDetected}
                        onSpeakClick={handleSpeakClick}
                        onCommand={handleCommand}
                        onNavigateToSettings={() => { setPage('settings'); audioService.click(); }}
                    />
                );
        }
    };
     return (
        <div 
            className="relative flex size-full min-h-screen flex-col bg-base justify-between group/design-root overflow-x-hidden font-body text-primary"
        >
            {mainContent()}
        </div>
    );
};

export default App;