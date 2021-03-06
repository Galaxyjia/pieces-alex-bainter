import Tone from 'tone';
import { Chord, Note } from 'tonal';
import { getBuffers, getSampler } from '@generative-music/utilities';

const makePiece = ({ audioContext, destination, samples }) => {
  if (Tone.context !== audioContext) {
    Tone.setContext(audioContext);
  }
  const noise = new Tone.Noise('brown');
  const eq = new Tone.EQ3(-15, -Infinity, -Infinity).connect(destination);
  eq.lowFrequency.value = Note.freq('C1');
  const lfo = new Tone.LFO({
    min: -50,
    max: -15,
    frequency: Math.random() / 100,
    phase: 45,
  });
  lfo.connect(eq.low);
  noise.connect(eq);
  lfo.start();

  const delay1 = new Tone.FeedbackDelay({
    feedback: 0.7,
    delayTime: 0.2,
    wet: 0.5,
  });
  const delay2 = new Tone.FeedbackDelay({
    feedback: 0.6,
    delayTime: Math.random() * 10 + 20,
    wet: 0.5,
  });
  const reverb = new Tone.Freeverb({ roomSize: 0.9, wet: 0.5 });
  reverb.chain(delay1, delay2, destination);

  const violinReverb = new Tone.Freeverb({ roomSize: 0.8, wet: 0.5 });

  const pianoSamples = samples['vsco2-piano-mf'];
  return Promise.all([
    getBuffers(pianoSamples),
    getSampler(samples['vsco2-violins-susvib'], {
      release: 8,
      curve: 'linear',
      volume: -35,
    }),
  ]).then(([buffers, violins]) => {
    const reversePiano = new Tone.Sampler(
      Reflect.ownKeys(pianoSamples).reduce((reverseConfig, note) => {
        reverseConfig[note] = buffers.get(note);
        reverseConfig[note].reverse = true;
        return reverseConfig;
      }, {})
    ).chain(reverb);

    violins.chain(violinReverb, reverb);

    Chord.notes('C', 'maj7')
      .reduce(
        (allNotes, pc) =>
          allNotes.concat([2, 3, 4].map(octave => `${pc}${octave}`)),
        []
      )
      .forEach(note => {
        Tone.Transport.scheduleRepeat(
          () => violins.triggerAttack(note, '+1'),
          Math.random() * 120 + 60,
          30
        );
      });

    const notes = Chord.notes('C', 'maj7').reduce(
      (allNotes, pc) =>
        allNotes.concat([3, 4, 5].map(octave => `${pc}${octave}`)),
      []
    );
    const intervals = notes.map(() => Math.random() * 30 + 30);
    const minInterval = Math.min(...intervals);
    notes.forEach((note, i) => {
      const intervalTime = intervals[i];
      Tone.Transport.scheduleRepeat(
        () => reversePiano.triggerAttack(note, '+1'),
        intervalTime,
        intervalTime - minInterval
      );
    });
    return () => {
      [
        noise,
        eq,
        lfo,
        delay1,
        delay2,
        reverb,
        violinReverb,
        violins,
        buffers,
        reversePiano,
      ].forEach(node => node.dispose());
    };
  });
};

export default makePiece;
