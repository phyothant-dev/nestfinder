-- Drop old tables (unused, different schema)
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  buyer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(property_id, buyer_id, seller_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast conversation lookup
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conversations_participant ON conversations(buyer_id, seller_id);

-- Enable realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'conversations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
    END IF;
  END IF;
END $$;

-- Function to update updated_at on conversation
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating conversation timestamp
DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();
