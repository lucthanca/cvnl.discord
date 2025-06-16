import InlineWorker from 'inline-worker';

interface RecorderConfig {
  bufferLen: number;
  numChannels: number;
  mimeType: string;
  callback?: (data: any) => void;
}

interface WorkerMessage {
  command: string;
  buffer?: Float32Array[];
  type?: string;
  config?: {
    sampleRate: number;
    numChannels: number;
  };
}

interface WorkerResponse {
  command: string;
  data: any;
}

type CallbackFunction = (data: any) => void;

interface Callbacks {
  getBuffer: CallbackFunction[];
  exportWAV: CallbackFunction[];
}

export class Recorder {
  config: RecorderConfig = {
    bufferLen: 4096,
    numChannels: 2,
    mimeType: 'audio/wav'
  };

  recording: boolean = false;

  callbacks: Callbacks = {
    getBuffer: [],
    exportWAV: []
  };
  context: AudioContext;
  node: ScriptProcessorNode;
  worker: InlineWorker;

  constructor(source: MediaStreamAudioSourceNode, cfg?: Partial<RecorderConfig>) {
    Object.assign(this.config, cfg);
    this.context = source.context as AudioContext;
    this.node = (this.context.createScriptProcessor || (this.context as any).createJavaScriptNode).call(this.context, this.config.bufferLen, this.config.numChannels, this.config.numChannels);

    this.node.onaudioprocess = (e) => {
      if (!this.recording) return;

      var buffer = [];
      for (var channel = 0; channel < this.config.numChannels; channel++) {
        buffer.push(e.inputBuffer.getChannelData(channel));
      }
      this.worker.postMessage({
        command: 'record',
        buffer: buffer
      });
    };

    source.connect(this.node);
    this.node.connect(this.context.destination);    //this should not be necessary

    let self_ = {};
    this.worker = new InlineWorker(function () {
      let recLength = 0,
        recBuffers: Float32Array[][] = [],
        sampleRate: number,
        numChannels: number;

      self.onmessage = function (e: MessageEvent<WorkerMessage>) {
        switch (e.data.command) {
          case 'init':
            init(e.data.config!);
            break;
          case 'record':
            record(e.data.buffer!);
            break;
          case 'exportWAV':
            exportWAV(e.data.type!);
            break;
          case 'getBuffer':
            getBuffer();
            break;
          case 'clear':
            clear();
            break;
        }
      };

      function init(config: { sampleRate: number; numChannels: number }) {
        sampleRate = config.sampleRate;
        numChannels = config.numChannels;
        initBuffers();
      }

      function record(inputBuffer: Float32Array[]) {
        for (var channel = 0; channel < numChannels; channel++) {
          recBuffers[channel].push(inputBuffer[channel]);
        }
        recLength += inputBuffer[0].length;
      }

      function exportWAV(type: string) {
        let buffers = [];
        for (let channel = 0; channel < numChannels; channel++) {
          buffers.push(mergeBuffers(recBuffers[channel], recLength));
        }
        let interleaved;
        if (numChannels === 2) {
          interleaved = interleave(buffers[0], buffers[1]);
        } else {
          interleaved = buffers[0];
        }
        let dataview = encodeWAV(interleaved);
        let audioBlob = new Blob([dataview], { type: type });

        self.postMessage({ command: 'exportWAV', data: audioBlob });
      }

      function getBuffer(): void {
        let buffers: Float32Array[] = [];
        for (let channel = 0; channel < numChannels; channel++) {
          buffers.push(mergeBuffers(recBuffers[channel], recLength));
        }
        self.postMessage({ command: 'getBuffer', data: buffers });
      }

      function clear(): void {
        recLength = 0;
        recBuffers = [];
        initBuffers();
      }

      function initBuffers() {
        for (let channel = 0; channel < numChannels; channel++) {
          recBuffers[channel] = [];
        }
      }

      function mergeBuffers(recBuffers: Float32Array[], recLength: number) {
        let result = new Float32Array(recLength);
        let offset = 0;
        for (let i = 0; i < recBuffers.length; i++) {
          result.set(recBuffers[i], offset);
          offset += recBuffers[i].length;
        }
        return result;
      }

      function interleave(inputL: Float32Array, inputR: Float32Array) {
        let length = inputL.length + inputR.length;
        let result = new Float32Array(length);

        let index = 0,
          inputIndex = 0;

        while (index < length) {
          result[index++] = inputL[inputIndex];
          result[index++] = inputR[inputIndex];
          inputIndex++;
        }
        return result;
      }

      function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
        for (let i = 0; i < input.length; i++, offset += 2) {
          let s = Math.max(-1, Math.min(1, input[i]));
          output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
      }

      function writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      }

      function encodeWAV(samples: Float32Array) {
        let buffer = new ArrayBuffer(44 + samples.length * 2);
        let view = new DataView(buffer);

        /* RIFF identifier */
        writeString(view, 0, 'RIFF');
        /* RIFF chunk length */
        view.setUint32(4, 36 + samples.length * 2, true);
        /* RIFF type */
        writeString(view, 8, 'WAVE');
        /* format chunk identifier */
        writeString(view, 12, 'fmt ');
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw) */
        view.setUint16(20, 1, true);
        /* channel count */
        view.setUint16(22, numChannels, true);
        /* sample rate */
        view.setUint32(24, sampleRate, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, sampleRate * 4, true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, numChannels * 2, true);
        /* bits per sample */
        view.setUint16(34, 16, true);
        /* data chunk identifier */
        writeString(view, 36, 'data');
        /* data chunk length */
        view.setUint32(40, samples.length * 2, true);

        floatTo16BitPCM(view, 44, samples);

        return view;
      }
    }, self_);

    this.worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate,
        numChannels: this.config.numChannels
      }
    });

    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      let cb = this.callbacks[e.data.command as keyof Callbacks].pop();
      if (typeof cb == 'function') {
        cb(e.data.data);
      }
    };
  }


  record() {
    this.recording = true;
  }

  stop() {
    this.recording = false;
  }

  clear() {
    this.worker.postMessage({ command: 'clear' });
  }

  getBuffer(cb?: CallbackFunction) {
    cb = cb || this.config.callback;
    if (!cb) throw new Error('Callback not set');

    this.callbacks.getBuffer.push(cb);

    this.worker.postMessage({ command: 'getBuffer' });
  }

  exportWAV(cb?: CallbackFunction, mimeType?: string) {
    mimeType = mimeType || this.config.mimeType;
    cb = cb || this.config.callback;
    if (!cb) throw new Error('Callback not set');

    this.callbacks.exportWAV.push(cb);

    this.worker.postMessage({
      command: 'exportWAV',
      type: mimeType
    });
  }

  static
    forceDownload(blob: Blob, filename?: string) {
    let url = (window.URL || window.webkitURL).createObjectURL(blob);
    let link = window.document.createElement('a');
    link.href = url;
    link.download = filename || 'output.wav';
    let click = document.createEvent("Event");
    click.initEvent("click", true, true);
    link.dispatchEvent(click);
  }
}

export default Recorder;