import { Kafka, Producer, Consumer } from "kafkajs";
import { EventEmitter } from "events";

// Global singleton for Event Emitter in simulation mode
declare global {
  var kafkaEventEmitter: EventEmitter | undefined;
}

const eventEmitter = global.kafkaEventEmitter || new EventEmitter();
if (process.env.NODE_ENV !== "production") {
  global.kafkaEventEmitter = eventEmitter;
}

const useSimulation = !process.env.KAFKA_BROKERS;

// Interfaces for our wrapper
export interface KafkaMessage {
  key?: string | Buffer | null;
  value: string | Buffer | null;
}

export interface KafkaPayload {
  topic: string;
  messages: KafkaMessage[];
}

export interface KafkaConsumerOptions {
  eachMessage: (payload: { topic: string; partition: number; message: KafkaMessage }) => Promise<void> | void;
}

class SimulatedProducer {
  async connect() {}
  async disconnect() {}
  async send(payload: KafkaPayload) {
    for (const msg of payload.messages) {
      // Simulate network latency
      setTimeout(() => {
        eventEmitter.emit(payload.topic, msg);
      }, 50);
    }
    return [{ topicName: payload.topic, partition: 0, baseOffset: "0" }];
  }
}

class SimulatedConsumer {
  private topics: string[] = [];
  async connect() {}
  async disconnect() {}
  async subscribe(options: { topic: string; fromBeginning?: boolean }) {
    if (!this.topics.includes(options.topic)) {
      this.topics.push(options.topic);
    }
  }
  async run(options: KafkaConsumerOptions) {
    for (const topic of this.topics) {
      eventEmitter.on(topic, async (message: KafkaMessage) => {
        try {
          await options.eachMessage({ topic, partition: 0, message });
        } catch (err: any) {
          console.error(`Error in simulated consumer for topic ${topic}:`, err);
        }
      });
    }
  }
}

let kafkaInstance: Kafka | null = null;
let realProducer: Producer | null = null;

if (!useSimulation) {
  try {
    const brokers = process.env.KAFKA_BROKERS!.split(",");
    kafkaInstance = new Kafka({
      clientId: "walmart-assist",
      brokers,
      ssl: process.env.KAFKA_SSL === "true",
      sasl: process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD
        ? {
            mechanism: "plain",
            username: process.env.KAFKA_SASL_USERNAME,
            password: process.env.KAFKA_SASL_PASSWORD,
          }
        : undefined,
    });
    realProducer = kafkaInstance.producer();
    realProducer.connect().catch((err) => {
      console.error("Failed to connect real Kafka producer:", err);
    });
  } catch (err) {
    console.error("Error creating Kafka client, reverting to simulation:", err);
  }
}

// Unified Producer interface
export const producer = {
  send: async (payload: KafkaPayload) => {
    if (useSimulation || !realProducer) {
      const p = new SimulatedProducer();
      return p.send(payload);
    }
    try {
      return await realProducer.send(payload);
    } catch (err) {
      console.warn("Real Kafka send failed, falling back to simulated emitter:", err);
      const p = new SimulatedProducer();
      return p.send(payload);
    }
  },
};

// Unified Consumer factory
export const createConsumer = (groupId: string) => {
  if (useSimulation || !kafkaInstance) {
    return new SimulatedConsumer();
  }
  try {
    const c = kafkaInstance.consumer({ groupId });
    return c;
  } catch (err) {
    console.warn("Real Kafka consumer creation failed, returning simulated consumer:", err);
    return new SimulatedConsumer();
  }
};
