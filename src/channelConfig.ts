export interface ChannelConfig {
    number: number;
    name: string;
    type: 'video' | 'teletext';
    video?: string; // Optional: only for video type
    link?: string;  // Optional: only for video type
    currentTime?: number; // Optional: only for video type
}

export const channels: ChannelConfig[] = [
    {
        number: 1,
        name: 'BBC1',
        type: 'video',
        video: 'videos/crush.mp4',
        link: 'https://crushcreative.com',
        currentTime: 0
    },
    {
        number: 2,
        name: 'BBC2',
        type: 'video',
        video: 'videos/wayve.mp4',
        link: 'https://wayve.ai',
        currentTime: 0
    },
    {
        number: 3,
        name: 'ITV',
        type: 'video',
        video: 'videos/atlas.mp4',
        link: 'https://myatlas.atlasoceanvoyages.com/',
        currentTime: 0
    },
    {
        number: 4,
        name: 'C4',
        type: 'teletext',
    },
];
