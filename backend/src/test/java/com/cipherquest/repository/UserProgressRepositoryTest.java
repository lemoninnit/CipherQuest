package com.cipherquest.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
public class UserProgressRepositoryTest {

    @Autowired
    private UserProgressRepository userProgressRepository;

    @Test
    public void testCountTotalCompletedPerUser() {
        List<Object[]> rows = userProgressRepository.countTotalCompletedPerUser();
        assertNotNull(rows);
        for (Object[] row : rows) {
            assertNotNull(row[0]);
            assertNotNull(row[1]);
        }
    }

    @Test
    public void testCountCompletedByCipherPerUser() {
        List<Object[]> rows = userProgressRepository.countCompletedByCipherPerUser("CAESAR");
        assertNotNull(rows);
    }
}
