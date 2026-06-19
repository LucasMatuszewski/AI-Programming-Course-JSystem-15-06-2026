create table service_sessions (
    id uuid primary key,
    request_type varchar(32) not null,
    status varchar(32) not null,
    terminal_state varchar(64),
    equipment_category varchar(64) not null,
    equipment_name_or_model varchar(200) not null,
    purchase_date date not null,
    reason text,
    image_attempt_count integer not null,
    created_at timestamp(6) with time zone not null
);

create table uploaded_images (
    id uuid primary key,
    session_id uuid not null references service_sessions(id),
    attempt_number integer not null,
    original_filename varchar(255) not null,
    content_type varchar(100) not null,
    size_bytes bigint not null,
    relative_path varchar(500) not null,
    evaluable boolean not null,
    retry_reason_pl text,
    created_at timestamp(6) with time zone not null
);

create table image_analyses (
    id uuid primary key,
    image_id uuid not null unique references uploaded_images(id),
    visible_damage_pl text,
    defect_indicators_pl text,
    usage_signs_pl text,
    possible_cause_indicators_pl text,
    missing_or_altered_parts_pl text,
    resale_condition_pl text,
    unclear boolean not null,
    summary_pl text not null,
    model varchar(100) not null,
    created_at timestamp(6) with time zone not null
);

create table decision_records (
    id uuid primary key,
    session_id uuid not null references service_sessions(id),
    version integer not null,
    status varchar(64) not null,
    rejection_type varchar(64),
    rejection_reason_pl text,
    justification_pl text not null,
    next_steps_pl text not null,
    rule_category varchar(100) not null,
    previous_decision_id uuid,
    created_at timestamp(6) with time zone not null
);

create table chat_messages (
    id uuid primary key,
    session_id uuid not null references service_sessions(id),
    role varchar(32) not null,
    content_pl text not null,
    sequence_number integer not null,
    message_type varchar(64) not null,
    created_at timestamp(6) with time zone not null
);

create index idx_service_sessions_created_at on service_sessions(created_at);
create index idx_uploaded_images_session_id on uploaded_images(session_id);
create index idx_decision_records_session_id_version on decision_records(session_id, version);
create index idx_chat_messages_session_id_sequence_number on chat_messages(session_id, sequence_number);
