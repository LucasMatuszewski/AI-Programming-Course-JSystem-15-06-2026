alter table image_analyses
    add column prompt_version varchar(100) not null default 'unknown';

alter table decision_records
    add column model varchar(100) not null default 'backend-rules-v1',
    add column prompt_version varchar(100) not null default 'decision-rules-v1';
