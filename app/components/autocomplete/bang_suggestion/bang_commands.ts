// Quick commands registry
// Each command defines trigger, description, and the full message to send

export type BangCommand = {
    trigger: string;
    hint: string;
    description: string;
    message: string;
};

const BANG_COMMANDS: BangCommand[] = [
    {
        trigger: '!bridge cancel',
        hint: '',
        description: 'Cancel current bridge operation',
        message: '!bridge cancel',
    },
    {
        trigger: '/new',
        hint: '',
        description: 'Start a new conversation',
        message: '/new',
    },
    {
        trigger: '/status',
        hint: '',
        description: 'Check status',
        message: '/status',
    },
    {
        trigger: '/model',
        hint: '',
        description: 'Switch or check model',
        message: '/model',
    },
    {
        trigger: 'confirm',
        hint: '',
        description: 'Confirm action',
        message: 'confirm',
    },
    {
        trigger: 'continue',
        hint: '',
        description: 'Continue',
        message: 'continue',
    },
];

export default BANG_COMMANDS;
