import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
    useLyricsPracticeActions,
    useLyricsPracticeLoop,
    useLyricsPracticeLoopDraft,
} from '/@/renderer/store/lyrics-practice.store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';

export interface PracticeLineMenuHandlers {
    onReplay: (lineIndex: number) => void;
    onSetLoopEnd: (lineIndex: number) => void;
    onSetLoopStart: (lineIndex: number) => void;
}

interface PracticeMenuItemsProps extends PracticeLineMenuHandlers {
    lineIndex: number;
}

// The practice actions for one lyric line. Rendered inside a ContextMenu
// (either PracticeLineMenu below or the admin EditableLyricLine menu) so
// practice controls never compete with click hit areas (line seek,
// KanjiPicker, JMdict word lookup, karaoke word seek).
export const PracticeMenuItems = ({
    lineIndex,
    onReplay,
    onSetLoopEnd,
    onSetLoopStart,
}: PracticeMenuItemsProps) => {
    const { t } = useTranslation();
    const loop = useLyricsPracticeLoop();
    const loopDraft = useLyricsPracticeLoopDraft();
    const { clearLoop } = useLyricsPracticeActions();

    return (
        <>
            <ContextMenu.Item leftIcon="refresh" onSelect={() => onReplay(lineIndex)}>
                {t('page.fullscreenPlayer.practiceReplayLine')}
            </ContextMenu.Item>
            <ContextMenu.Item leftIcon="arrowLeftToLine" onSelect={() => onSetLoopStart(lineIndex)}>
                {t('page.fullscreenPlayer.practiceLoopStart')}
            </ContextMenu.Item>
            <ContextMenu.Item leftIcon="arrowRightToLine" onSelect={() => onSetLoopEnd(lineIndex)}>
                {t('page.fullscreenPlayer.practiceLoopEnd')}
            </ContextMenu.Item>
            {(loop || loopDraft) && (
                <ContextMenu.Item leftIcon="remove" onSelect={clearLoop}>
                    {t('page.fullscreenPlayer.practiceLoopClear')}
                </ContextMenu.Item>
            )}
        </>
    );
};

interface PracticeLineMenuProps extends PracticeMenuItemsProps {
    children: ReactNode;
}

export const PracticeLineMenu = ({ children, ...itemProps }: PracticeLineMenuProps) => {
    return (
        <ContextMenu>
            <ContextMenu.Target>
                {/* LyricLine/KaraokeLyricLine are not forwardRef; wrap in a real
                    DOM node so Radix's asChild trigger opens on right-click. */}
                <div>{children}</div>
            </ContextMenu.Target>
            <ContextMenu.Content>
                <PracticeMenuItems {...itemProps} />
            </ContextMenu.Content>
        </ContextMenu>
    );
};
