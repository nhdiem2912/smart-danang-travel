export const OPTIONS = {
  gender: [
    ['skip', 'Không muốn cung cấp'],
    ['male', 'Nam'],
    ['female', 'Nữ'],
    ['other', 'Khác'],
  ],
  ageGroup: [
    ['skip', 'Không muốn cung cấp'],
    ['under18', 'Dưới 18'],
    ['18to24', '18–24'],
    ['25to34', '25–34'],
    ['35to50', '35–50'],
    ['over50', 'Trên 50'],
  ],
  companion: [
    ['solo', 'Một mình'],
    ['couple', 'Cặp đôi'],
    ['friends', 'Bạn bè'],
    ['family', 'Gia đình'],
  ],
  interests: [
    ['beach', 'Biển & nghỉ dưỡng'],
    ['food', 'Ẩm thực địa phương'],
    ['photos', 'Check-in cảnh đẹp'],
    ['nightlife', 'Trải nghiệm đêm'],
    ['culture', 'Văn hóa & lịch sử'],
    ['cafe', 'Cà phê & thư giãn'],
  ],
  budget: [
    ['economy', 'Tiết kiệm'],
    ['standard', 'Tiêu chuẩn'],
    ['comfort', 'Thoải mái'],
    ['luxury', 'Cao cấp'],
  ],
  timeSlot: [
    ['early', 'Sáng sớm'],
    ['morning', 'Buổi sáng'],
    ['afternoon', 'Chiều hoàng hôn'],
    ['evening', 'Buổi tối'],
  ],
} as const;

export type TravelerProfile = {
  version: 1;
  displayName: string;
  gender: string;
  ageGroup: string;
  companion: string;
  interests: string[];
  budget: string;
  timeSlot: string;
  onboardingComplete: true;
  updatedAt: string;
};

export type ProfileInput = Omit<
  TravelerProfile,
  'version' | 'onboardingComplete' | 'updatedAt'
>;

export function initialPreferences(
  name = '',
): ProfileInput {
  return {
    displayName: name,
    gender: 'skip',
    ageGroup: 'skip',
    companion: '',
    interests: [],
    budget: '',
    timeSlot: '',
  };
}

export function profileInputError(
  value: ProfileInput,
): string | null {
  if (
    typeof value.displayName !== 'string' ||
    !value.displayName.trim() ||
    value.displayName.trim().length > 80
  ) {
    return 'Nhập tên hiển thị từ 1 đến 80 ký tự.';
  }

  for (
    const key of [
      'gender',
      'ageGroup',
      'companion',
      'budget',
      'timeSlot',
    ] as const
  ) {
    const options =
      OPTIONS[key] as readonly (readonly string[])[];

    if (
      !options.some(row => row[0] === value[key])
    ) {
      return 'Hãy hoàn thành các lựa chọn trong khảo sát.';
    }
  }

  if (
    !Array.isArray(value.interests) ||
    value.interests.length < 1 ||
    value.interests.length > 6 ||
    new Set(value.interests).size !==
      value.interests.length ||
    value.interests.some(
      id =>
        !OPTIONS.interests.some(
          row => row[0] === id,
        ),
    )
  ) {
    return 'Chọn ít nhất một sở thích hợp lệ.';
  }

  return null;
}

export function isTravelerProfile(
  value: unknown,
): value is TravelerProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const p = value as TravelerProfile;

  return (
    p.version === 1 &&
    p.onboardingComplete === true &&
    typeof p.updatedAt === 'string' &&
    Number.isFinite(Date.parse(p.updatedAt)) &&
    !profileInputError(p)
  );
}

export function encodeProfile(
  p: TravelerProfile,
) {
  return {
    version: {
      integerValue: '1',
    },
    displayName: {
      stringValue: p.displayName,
    },
    gender: {
      stringValue: p.gender,
    },
    ageGroup: {
      stringValue: p.ageGroup,
    },
    companion: {
      stringValue: p.companion,
    },
    interests: {
      arrayValue: {
        values: p.interests.map(
          stringValue => ({ stringValue }),
        ),
      },
    },
    budget: {
      stringValue: p.budget,
    },
    timeSlot: {
      stringValue: p.timeSlot,
    },
    onboardingComplete: {
      booleanValue: true,
    },
    updatedAt: {
      stringValue: p.updatedAt,
    },
  };
}

export function decodeProfile(
  document: unknown,
): TravelerProfile {
  const fields = (
    document as {
      fields?: Record<
        string,
        {
          stringValue?: string;
          integerValue?: string;
          booleanValue?: boolean;
          arrayValue?: {
            values?: {
              stringValue?: string;
            }[];
          };
        }
      >;
    }
  )?.fields;

  if (!fields) {
    throw new Error(
      'Hồ sơ trên máy chủ không hợp lệ.',
    );
  }

  const result = {
    version: Number(
      fields.version?.integerValue,
    ),
    displayName:
      fields.displayName?.stringValue,
    gender: fields.gender?.stringValue,
    ageGroup: fields.ageGroup?.stringValue,
    companion:
      fields.companion?.stringValue,
    interests:
      fields.interests?.arrayValue?.values?.map(
        v => v.stringValue,
      ) ?? [],
    budget: fields.budget?.stringValue,
    timeSlot: fields.timeSlot?.stringValue,
    onboardingComplete:
      fields.onboardingComplete?.booleanValue,
    updatedAt: fields.updatedAt?.stringValue,
  };

  if (!isTravelerProfile(result)) {
    throw new Error(
      'Hồ sơ trên máy chủ không hợp lệ.',
    );
  }

  return result;
}