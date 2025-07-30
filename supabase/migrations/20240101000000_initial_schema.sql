-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  username text unique,
  full_name text,
  avatar_url text,
  company text,
  plan text default 'starter'::text,
  usage_limit integer default 1000,
  current_usage integer default 0,
  
  constraint username_length check (char_length(username) >= 3)
);

-- Create agents table
create table agents (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  type text check (type in ('chat', 'voice', 'vision')) not null,
  status text check (status in ('active', 'inactive', 'training')) default 'inactive'::text,
  settings jsonb default '{}'::jsonb,
  knowledge_base_id uuid,
  integrations text[] default '{}'::text[],
  conversation_count integer default 0,
  last_active timestamp with time zone,
  
  constraint name_length check (char_length(name) >= 1)
);

-- Create conversations table
create table conversations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  agent_id uuid references agents(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  customer_id uuid,
  channel text not null,
  status text check (status in ('active', 'completed', 'escalated')) default 'active'::text,
  messages jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb
);

-- Create knowledge_bases table
create table knowledge_bases (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  documents_count integer default 0,
  size_bytes bigint default 0,
  status text check (status in ('active', 'processing', 'error')) default 'active'::text,
  
  constraint name_length check (char_length(name) >= 1)
);

-- Create documents table
create table documents (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  knowledge_base_id uuid references knowledge_bases(id) on delete cascade not null,
  name text not null,
  content text,
  file_url text,
  file_type text,
  size_bytes bigint default 0,
  status text check (status in ('processed', 'processing', 'error')) default 'processing'::text,
  metadata jsonb default '{}'::jsonb
);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table agents enable row level security;
alter table conversations enable row level security;
alter table knowledge_bases enable row level security;
alter table documents enable row level security;

-- Create policies for profiles
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Create policies for agents
create policy "Users can view own agents" on agents for select using (auth.uid() = user_id);
create policy "Users can create own agents" on agents for insert with check (auth.uid() = user_id);
create policy "Users can update own agents" on agents for update using (auth.uid() = user_id);
create policy "Users can delete own agents" on agents for delete using (auth.uid() = user_id);

-- Create policies for conversations
create policy "Users can view own conversations" on conversations for select using (auth.uid() = user_id);
create policy "Users can create own conversations" on conversations for insert with check (auth.uid() = user_id);
create policy "Users can update own conversations" on conversations for update using (auth.uid() = user_id);
create policy "Users can delete own conversations" on conversations for delete using (auth.uid() = user_id);

-- Create policies for knowledge_bases
create policy "Users can view own knowledge bases" on knowledge_bases for select using (auth.uid() = user_id);
create policy "Users can create own knowledge bases" on knowledge_bases for insert with check (auth.uid() = user_id);
create policy "Users can update own knowledge bases" on knowledge_bases for update using (auth.uid() = user_id);
create policy "Users can delete own knowledge bases" on knowledge_bases for delete using (auth.uid() = user_id);

-- Create policies for documents
create policy "Users can view documents in own knowledge bases" on documents for select using (
  exists (
    select 1 from knowledge_bases kb 
    where kb.id = documents.knowledge_base_id 
    and kb.user_id = auth.uid()
  )
);
create policy "Users can create documents in own knowledge bases" on documents for insert with check (
  exists (
    select 1 from knowledge_bases kb 
    where kb.id = documents.knowledge_base_id 
    and kb.user_id = auth.uid()
  )
);
create policy "Users can update documents in own knowledge bases" on documents for update using (
  exists (
    select 1 from knowledge_bases kb 
    where kb.id = documents.knowledge_base_id 
    and kb.user_id = auth.uid()
  )
);
create policy "Users can delete documents in own knowledge bases" on documents for delete using (
  exists (
    select 1 from knowledge_bases kb 
    where kb.id = documents.knowledge_base_id 
    and kb.user_id = auth.uid()
  )
);

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, company)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'company'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to automatically create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create triggers for updated_at
create trigger handle_updated_at before update on profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on agents
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on knowledge_bases
  for each row execute procedure public.handle_updated_at();

-- Create indexes for better performance
create index profiles_username_idx on profiles(username);
create index agents_user_id_idx on agents(user_id);
create index agents_type_idx on agents(type);
create index agents_status_idx on agents(status);
create index conversations_user_id_idx on conversations(user_id);
create index conversations_agent_id_idx on conversations(agent_id);
create index conversations_status_idx on conversations(status);
create index knowledge_bases_user_id_idx on knowledge_bases(user_id);
create index documents_knowledge_base_id_idx on documents(knowledge_base_id);