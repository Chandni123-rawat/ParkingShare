--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;


--
-- Name: admin_action_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_action_logs (
    id integer NOT NULL,
    admin_id integer NOT NULL,
    target_user_id integer,
    action character varying(100) NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: admin_action_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_action_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_action_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_action_logs_id_seq OWNED BY public.admin_action_logs.id;


--
-- Name: availability_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_rules (
    id integer NOT NULL,
    parking_space_id integer NOT NULL,
    days_of_week integer[] NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    valid_from date NOT NULL,
    valid_until date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: availability_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.availability_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: availability_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.availability_rules_id_seq OWNED BY public.availability_rules.id;


--
-- Name: availability_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_slots (
    id integer NOT NULL,
    parking_space_id integer NOT NULL,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    source character varying(20) DEFAULT 'recurring'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT availability_slots_source_check CHECK (((source)::text = ANY ((ARRAY['recurring'::character varying, 'manual'::character varying])::text[]))),
    CONSTRAINT availability_slots_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'blocked'::character varying])::text[])))
);


--
-- Name: availability_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.availability_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: availability_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.availability_slots_id_seq OWNED BY public.availability_slots.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    seeker_id integer NOT NULL,
    parking_space_id integer NOT NULL,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(30) DEFAULT 'PENDING_PAYMENT'::character varying NOT NULL,
    expires_at timestamp without time zone,
    checkin_time timestamp without time zone,
    checkout_time timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    vehicle_id integer,
    checkin_otp text,
    otp_verified boolean DEFAULT false,
    otp_attempts integer DEFAULT 0 NOT NULL,
    otp_locked boolean DEFAULT false NOT NULL,
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING_PAYMENT'::character varying, 'CONFIRMED'::character varying, 'ACTIVE'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'CANCELLATION_PENDING'::character varying, 'PAYMENT_FAILED'::character varying, 'EXPIRED'::character varying])::text[])))
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: parking_spaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parking_spaces (
    id integer NOT NULL,
    owner_id integer NOT NULL,
    title character varying(150) NOT NULL,
    description text,
    address text NOT NULL,
    latitude numeric(10,7),
    longitude numeric(10,7),
    price_per_hour numeric(10,2) NOT NULL,
    is_available boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    photos text[] DEFAULT '{}'::text[],
    approval_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    rejection_reason text,
    CONSTRAINT parking_spaces_approval_status_check CHECK (((approval_status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


--
-- Name: parking_spaces_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.parking_spaces_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parking_spaces_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.parking_spaces_id_seq OWNED BY public.parking_spaces.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    payment_method character varying(30),
    transaction_id character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    razorpay_order_id character varying(255),
    razorpay_payment_id character varying(255),
    refund_status character varying(20) DEFAULT 'NOT_REQUESTED'::character varying NOT NULL,
    razorpay_refund_id character varying(100),
    refund_amount numeric(10,2),
    refund_requested_at timestamp without time zone,
    refunded_at timestamp without time zone,
    CONSTRAINT payments_refund_status_check CHECK (((refund_status)::text = ANY ((ARRAY['NOT_REQUESTED'::character varying, 'PENDING'::character varying, 'PROCESSED'::character varying, 'FAILED'::character varying])::text[]))),
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'SUCCESS'::character varying, 'FAILED'::character varying, 'REFUNDED'::character varying])::text[])))
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: platform_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_config (
    key character varying(100) NOT NULL,
    value numeric(10,4) NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) DEFAULT 'seeker'::character varying NOT NULL,
    verification_status character varying(20) DEFAULT 'unverified'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    refresh_token text,
    account_status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    bio character varying(500) DEFAULT ''::character varying NOT NULL,
    CONSTRAINT users_account_status_check CHECK (((account_status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'SUSPENDED'::character varying])::text[]))),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['seeker'::character varying, 'owner'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT users_verification_status_check CHECK (((verification_status)::text = ANY ((ARRAY['unverified'::character varying, 'verified'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    vehicle_number character varying(30) NOT NULL,
    vehicle_type character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vehicles_vehicle_type_check CHECK (((vehicle_type)::text = ANY ((ARRAY['car'::character varying, 'bike'::character varying, 'scooter'::character varying, 'other'::character varying])::text[])))
);


--
-- Name: vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehicles_id_seq OWNED BY public.vehicles.id;


--
-- Name: wallet_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_settlements (
    id integer NOT NULL,
    owner_id integer NOT NULL,
    booking_id integer NOT NULL,
    gross_amount numeric(10,2) NOT NULL,
    platform_fee numeric(10,2) NOT NULL,
    owner_earning numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    settled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT wallet_settlements_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'withdrawal_requested'::character varying, 'settled'::character varying])::text[])))
);


--
-- Name: wallet_settlements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wallet_settlements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wallet_settlements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wallet_settlements_id_seq OWNED BY public.wallet_settlements.id;


--
-- Name: admin_action_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_action_logs ALTER COLUMN id SET DEFAULT nextval('public.admin_action_logs_id_seq'::regclass);


--
-- Name: availability_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_rules ALTER COLUMN id SET DEFAULT nextval('public.availability_rules_id_seq'::regclass);


--
-- Name: availability_slots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots ALTER COLUMN id SET DEFAULT nextval('public.availability_slots_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: parking_spaces id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_spaces ALTER COLUMN id SET DEFAULT nextval('public.parking_spaces_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vehicles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles ALTER COLUMN id SET DEFAULT nextval('public.vehicles_id_seq'::regclass);


--
-- Name: wallet_settlements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_settlements ALTER COLUMN id SET DEFAULT nextval('public.wallet_settlements_id_seq'::regclass);


--
-- Name: admin_action_logs admin_action_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_action_logs
    ADD CONSTRAINT admin_action_logs_pkey PRIMARY KEY (id);


--
-- Name: availability_rules availability_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_pkey PRIMARY KEY (id);


--
-- Name: availability_slots availability_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: parking_spaces parking_spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_spaces
    ADD CONSTRAINT parking_spaces_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_razorpay_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_razorpay_order_id_key UNIQUE (razorpay_order_id);


--
-- Name: payments payments_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);


--
-- Name: platform_config platform_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_config
    ADD CONSTRAINT platform_config_pkey PRIMARY KEY (key);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: wallet_settlements wallet_settlements_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_settlements
    ADD CONSTRAINT wallet_settlements_booking_id_key UNIQUE (booking_id);


--
-- Name: wallet_settlements wallet_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_settlements
    ADD CONSTRAINT wallet_settlements_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_logs_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_admin ON public.admin_action_logs USING btree (admin_id);


--
-- Name: users_email_lower_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_lower_unique ON public.users USING btree (lower((email)::text));


--
-- Name: admin_action_logs admin_action_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_action_logs
    ADD CONSTRAINT admin_action_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: admin_action_logs admin_action_logs_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_action_logs
    ADD CONSTRAINT admin_action_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: availability_rules availability_rules_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_rules
    ADD CONSTRAINT availability_rules_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: availability_slots availability_slots_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_parking_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_parking_space_id_fkey FOREIGN KEY (parking_space_id) REFERENCES public.parking_spaces(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_seeker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_seeker_id_fkey FOREIGN KEY (seeker_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: parking_spaces parking_spaces_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parking_spaces
    ADD CONSTRAINT parking_spaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: vehicles vehicles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wallet_settlements wallet_settlements_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_settlements
    ADD CONSTRAINT wallet_settlements_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: wallet_settlements wallet_settlements_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_settlements
    ADD CONSTRAINT wallet_settlements_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--



ALTER TABLE public.parking_spaces
    ADD COLUMN IF NOT EXISTS capacity integer NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 500),
    ADD COLUMN IF NOT EXISTS vehicle_types text[] NOT NULL DEFAULT ARRAY['car', 'bike']
        CHECK (cardinality(vehicle_types) BETWEEN 1 AND 2
               AND vehicle_types <@ ARRAY['car', 'bike']::text[]
               AND array_position(vehicle_types, NULL) IS NULL
               AND (cardinality(vehicle_types) = 1 OR vehicle_types[1] <> vehicle_types[2])),
    ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE TABLE IF NOT EXISTS public.parking_images (
    id uuid PRIMARY KEY,
    parking_space_id integer NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
    content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
    contents bytea NOT NULL CHECK (octet_length(contents) BETWEEN 1 AND 5242880)
);
CREATE INDEX IF NOT EXISTS parking_images_space_idx ON public.parking_images(parking_space_id);

ALTER TABLE public.availability_slots
    ADD COLUMN IF NOT EXISTS rule_id integer REFERENCES public.availability_rules(id) ON DELETE SET NULL;

UPDATE public.availability_slots s
SET rule_id = (
    SELECT MIN(r.id) FROM public.availability_rules r
    WHERE r.parking_space_id = s.parking_space_id AND r.start_time = s.start_time AND r.end_time = s.end_time
      AND s.date BETWEEN r.valid_from AND LEAST(COALESCE(r.valid_until, r.valid_from + 30), r.valid_from + 30)
      AND EXTRACT(DOW FROM s.date)::integer = ANY(r.days_of_week)
)
WHERE s.source = 'recurring' AND s.rule_id IS NULL;

CREATE INDEX IF NOT EXISTS parking_spaces_owner_idx ON public.parking_spaces(owner_id);
CREATE INDEX IF NOT EXISTS parking_availability_window_idx ON public.availability_slots(parking_space_id, date, status, start_time);
CREATE INDEX IF NOT EXISTS parking_booking_window_idx ON public.bookings(parking_space_id, date, start_time)
    WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'CANCELLATION_PENDING');

CREATE OR REPLACE FUNCTION public.parking_peak_load(
    space_id integer, booking_date date, from_time time, until_time time
) RETURNS integer LANGUAGE sql STABLE AS $function$
    WITH reservations AS (
        SELECT b.start_time, b.end_time FROM public.bookings b
        WHERE b.parking_space_id = space_id AND b.date = booking_date
          AND b.status IN ('PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'CANCELLATION_PENDING')
          AND b.start_time < until_time AND b.end_time > from_time
    ), change_points AS (
        SELECT from_time AS point
        UNION
        SELECT start_time FROM reservations WHERE start_time > from_time
    )
    SELECT COALESCE(MAX(n), 0)::integer FROM (
        SELECT COUNT(*) AS n FROM change_points p
        JOIN reservations r ON r.start_time <= p.point AND r.end_time > p.point
        GROUP BY p.point
    ) loads;
$function$;

INSERT INTO public.platform_config (key, value) VALUES ('commission_rate', 0.1000) ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS request_key uuid,
    ADD COLUMN IF NOT EXISTS pass_nonce uuid, ADD COLUMN IF NOT EXISTS vehicle_number_snapshot text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS captured_at timestamptz,
    ADD COLUMN IF NOT EXISTS currency varchar(3) NOT NULL DEFAULT 'INR';

CREATE UNIQUE INDEX IF NOT EXISTS booking_request_unique
    ON public.bookings(seeker_id, request_key) WHERE request_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_seeker_window_idx ON public.bookings(seeker_id, date, start_time);
CREATE INDEX IF NOT EXISTS payments_booking_idx ON public.payments(booking_id, id DESC);

CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
    event_id text PRIMARY KEY,
    received_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.razorpay_payment_attempts (
    provider_payment_id text PRIMARY KEY,
    payment_id integer NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('FAILED', 'CAPTURED')),
    recorded_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS razorpay_attempt_order_idx ON public.razorpay_payment_attempts(payment_id, recorded_at);

UPDATE public.bookings b SET pass_nonce = gen_random_uuid()
WHERE b.pass_nonce IS NULL AND b.status IN ('CONFIRMED','ACTIVE');
UPDATE public.bookings b SET vehicle_number_snapshot = v.vehicle_number
FROM public.vehicles v WHERE v.id = b.vehicle_id AND b.vehicle_number_snapshot IS NULL;

CREATE OR REPLACE FUNCTION public.parking_peak_load(
    space_id integer, booking_date date, from_time time, until_time time
) RETURNS integer LANGUAGE sql STABLE AS $function$
    WITH reservations AS (
        SELECT b.start_time, b.end_time FROM public.bookings b
        WHERE b.parking_space_id = space_id AND b.date = booking_date
          AND (b.status IN ('CONFIRMED', 'ACTIVE', 'CANCELLATION_PENDING')
            OR b.status = 'PENDING_PAYMENT' AND (b.expires_at IS NULL OR b.expires_at > NOW()))
          AND b.start_time < until_time AND b.end_time > from_time
    ), change_points AS (
        SELECT from_time AS point
        UNION
        SELECT start_time FROM reservations WHERE start_time > from_time
    )
    SELECT COALESCE(MAX(n), 0)::integer FROM (
        SELECT COUNT(*) AS n FROM change_points p
        JOIN reservations r ON r.start_time <= p.point AND r.end_time > p.point
        GROUP BY p.point
    ) loads;
$function$;

-- Final administration and notification features.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_account_status_check
    CHECK (account_status IN ('ACTIVE','DEACTIVATED'));

ALTER TABLE public.parking_spaces ADD COLUMN IF NOT EXISTS admin_deactivated_at timestamptz;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS event_key text,
    ADD COLUMN IF NOT EXISTS booking_id integer REFERENCES public.bookings(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event_idx ON public.notifications(user_id,event_key);
CREATE INDEX IF NOT EXISTS notifications_user_feed_idx ON public.notifications(user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS confirmed_booking_arrival_idx ON public.bookings(date,start_time) WHERE status = 'CONFIRMED';

CREATE TABLE IF NOT EXISTS public.parking_reports (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parking_space_id integer NOT NULL REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
    reporter_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 1000),
    status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED','DISMISSED')),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    reviewed_at timestamptz,
    reviewed_by integer REFERENCES public.users(id) ON DELETE SET NULL,
    review_note text CHECK (char_length(review_note) <= 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS parking_reports_one_open_idx
    ON public.parking_reports(parking_space_id,reporter_id) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS parking_reports_status_idx ON public.parking_reports(status,created_at DESC);
